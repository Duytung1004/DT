
const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/db");
const upload = require("../config/upload");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const {
  verifyToken,
} = require("../middleware/authMiddleware");
const {
  decodeFileName,
  safeFileName,
} = require("../utils/fileNameHelper");
// ======================
// READ FILE
// ======================
async function extractFileContent(file) {
  const filePath = file.path;
  const type = file.mimetype;

  let content = "";

  if (type === "application/pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    content = data.text;
  }

  else if (
    type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    content = result.value;
  }

  else if (type === "text/plain") {
    content = fs.readFileSync(filePath, "utf-8");
  }

  else {
    throw new Error("Chỉ hỗ trợ PDF / DOCX / TXT");
  }

  return content.slice(0, 6000);
}

// ======================
// CALL OPENROUTER
// ======================
async function callAI(messages) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openai/gpt-4o-mini",
      messages,
      temperature: 0.2,
      max_tokens: 1200,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}


// SEARCH SYSTEM DATABASE

async function searchSystemContext(question, user) {
  const rawQuestion = question.trim().toLowerCase();

  const isCompletedQuestion =
  rawQuestion.includes("hoàn thành") ||
  rawQuestion.includes("hoan thanh") ||
  rawQuestion.includes("đã xong") ||
  rawQuestion.includes("da xong");

const isOverdueQuestion =
  rawQuestion.includes("quá hạn") ||
  rawQuestion.includes("qua han") ||
  rawQuestion.includes("trễ hạn") ||
  rawQuestion.includes("tre han") ||
  rawQuestion.includes("deadline");

const isDoingQuestion =
  rawQuestion.includes("đang thực hiện") ||
  rawQuestion.includes("dang thuc hien") ||
  rawQuestion.includes("đang làm") ||
  rawQuestion.includes("dang lam");

const isTaskLookupQuestion =
  rawQuestion.includes("nhiệm vụ") ||
  rawQuestion.includes("nhiem vu") ||
  rawQuestion.includes("task") ||
  rawQuestion.includes("công việc") ||
  rawQuestion.includes("cong viec");

const isGenericTaskQuestion =
  isTaskLookupQuestion &&
  (
    rawQuestion.includes("tra cứu") ||
    rawQuestion.includes("tra cuu") ||
    rawQuestion.includes("danh sách") ||
    rawQuestion.includes("danh sach") ||
    rawQuestion.includes("liệt kê") ||
    rawQuestion.includes("liet ke") ||
    rawQuestion.includes("xem")
  );

const keyword = `%${question.trim()}%`;

const values = [];

let taskSearchCondition = "";

if (isCompletedQuestion) {
  taskSearchCondition = `
    AND (
      tt.code = 'hoan_thanh'
      OR t.completed_at IS NOT NULL
      OR t.archived_at IS NOT NULL
    )
  `;
} else if (isOverdueQuestion) {
  taskSearchCondition = `
    AND (
      tt.code = 'qua_han'
      OR (
        t.han_chot < CURRENT_DATE
        AND COALESCE(tt.code, '') <> 'hoan_thanh'
      )
    )
  `;
} else if (isDoingQuestion) {
  taskSearchCondition = `
    AND tt.code = 'dang_thuc_hien'
  `;
} else if (isGenericTaskQuestion) {
  taskSearchCondition = `
    AND TRUE
  `;
} else {
  values.push(keyword);

  taskSearchCondition = `
    AND (
      t.tieu_de ILIKE $${values.length}
      OR t.mo_ta ILIKE $${values.length}
      OR un.name ILIKE $${values.length}
      OR tt.name ILIKE $${values.length}
    )
  `;
}

  let permissionCondition = "";
  const permissions = user.permissions || [];
  const userId = user.userId || user.id;

  // Lãnh đạo/admin xem tất cả
  if (permissions.includes("task:view_all")) {
    permissionCondition = "";
  }

  // Trưởng phòng xem theo phòng ban
  else if (
    permissions.includes("task:view_unit") &&
    user.unit_id
  ) {
    values.push(user.unit_id);

    permissionCondition = `
      AND t.unit_id = $${values.length}
    `;
  }

  // Nhân viên xem nhiệm vụ liên quan mình
  else {
    values.push(userId);

    permissionCondition = `
      AND (
        t.assignee_user_id = $${values.length}
        OR EXISTS (
          SELECT 1
          FROM subtasks s
          WHERE s.task_id = t.id
            AND s.assignee_user_id = $${values.length}
        )
      )
    `;
  }

  const taskResult = await pool.query(
    `
    SELECT
      t.id,
      t.tieu_de,
      t.mo_ta,
      t.han_chot,
      t.created_at,
      t.completed_at,
      t.archived_at,
      tt.code AS status_code,
      tt.name AS status_name,
      un.name AS unit_name,
      u.full_name AS assignee_name
    FROM tasks t
    LEFT JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id
    LEFT JOIN units un
      ON t.unit_id = un.id
    LEFT JOIN users u
      ON t.assignee_user_id = u.id
    WHERE t.deleted_at IS NULL
      ${taskSearchCondition}
      ${permissionCondition}
    ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC
    LIMIT 8
    `,
    values
  );

  const documentResult = await pool.query(
    `
    SELECT
      d.id,
      d.so_ky_hieu,
      d.tieu_de,
      d.trich_yeu,
      d.don_vi_ban_hanh,
      d.ngay_nhan,
      d.workflow_status,
      d.status,
      d.file_name,
      d.file_path,
      un.name AS unit_name
    FROM documents d
    LEFT JOIN units un
      ON d.unit_id = un.id
    WHERE d.deleted_at IS NULL
      AND (
        d.tieu_de ILIKE $1
        OR d.so_ky_hieu ILIKE $1
        OR d.trich_yeu ILIKE $1
        OR d.don_vi_ban_hanh ILIKE $1
      )
    ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC
    LIMIT 8
    `,
    [keyword]
  );

  const stopWords = [
  "là",
  "gì",
  "nào",
  "của",
  "cho",
  "về",
  "trong",
  "như",
  "thế",
  "nào",
  "không",
  "hãy",
  "giúp",
  "mình",
  "tôi",
];

const knowledgeKeywords = rawQuestion
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .split(/\s+/)
  .map((word) => word.trim())
  .filter(
    (word) =>
      word.length >= 3 &&
      !stopWords.includes(word)
  )
  .slice(0, 8)
  .map((word) => `%${word}%`);

const knowledgePatterns =
  knowledgeKeywords.length > 0
    ? knowledgeKeywords
    : [keyword];
let knowledgeResult = { rows: [] };

if (!isTaskLookupQuestion) {
  knowledgeResult = await pool.query(
    `
    SELECT
      id,
      question,
      answer,
      topic
    FROM ai_knowledge_base
    WHERE question ILIKE ANY($1::text[])
      OR answer ILIKE ANY($1::text[])
      OR topic ILIKE ANY($1::text[])
    ORDER BY updated_at DESC
    LIMIT 5
    `,
    [knowledgePatterns]
  );
}

return {
  tasks: taskResult.rows,
  documents: documentResult.rows,
  reports: [],
  kpis: [],
  archives: [],
  knowledge: knowledgeResult.rows,
};
}

function hasUsefulContext(context) {
  return (
    context.tasks.length > 0 ||
    context.documents.length > 0 ||
    context.reports.length > 0 ||
    context.kpis.length > 0 ||
    context.archives.length > 0 ||
    context.knowledge.length > 0
  );
}

// ======================
// READ LATEST FILE IN AI CONVERSATION
// ======================
async function getLatestFileContext(conversationId, userId) {
  const result = await pool.query(
    `
    SELECT
      file_name,
      file_url,
      file_type
    FROM messages
    WHERE conversation_id = $1
      AND sender_id = $2
      AND role = 'user'
      AND file_url IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [conversationId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const file = result.rows[0];

  const relativePath = file.file_url.replace(/^\/+/, "");
  const fullPath = path.join(__dirname, "../../", relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  let content = "";

  if (file.file_type === "application/pdf") {
    const buffer = fs.readFileSync(fullPath);
    const data = await pdfParse(buffer);
    content = data.text;
  } else if (
    file.file_type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ path: fullPath });
    content = result.value;
  } else if (file.file_type === "text/plain") {
    content = fs.readFileSync(fullPath, "utf-8");
  } else {
    return null;
  }

  return {
    fileName: file.file_name,
    fileType: file.file_type,
    content: content.slice(0, 6000),
  };
}

function isFileFollowUpQuestion(message) {
  const text = message.trim().toLowerCase();

  return (
    text.includes("văn bản đó") ||
    text.includes("van ban do") ||
    text.includes("file đó") ||
    text.includes("file do") ||
    text.includes("tài liệu đó") ||
    text.includes("tai lieu do") ||
    text.includes("nội dung trên") ||
    text.includes("noi dung tren") ||
    text.includes("ý chính") ||
    text.includes("y chinh") ||
    text.includes("tóm tắt") ||
    text.includes("tom tat") ||
    text.includes("phân tích văn bản") ||
    text.includes("phan tich van ban")
  );
}

function parseLearningMessage(message) {
  const text = message.trim();

  const prefixes = [
    "AI nhớ:",
    "Ai nhớ:",
    "ai nhớ:",
    "Ghi nhớ:",
    "ghi nhớ:",
    "Bổ sung tri thức:",
    "bổ sung tri thức:",
    "Câu trả lời đúng là:",
    "câu trả lời đúng là:",
  ];

  const prefix = prefixes.find((item) =>
    text.startsWith(item)
  );

  if (!prefix) return null;

  const content = text
    .slice(prefix.length)
    .trim();

  if (!content || content.length < 10) {
    return null;
  }

  return {
    question: content.slice(0, 250),
    answer: content,
    topic: "chat_learning",
  };
}

// ======================
// AI FROM FILE
// ======================
router.post(
  "/from-file",
  verifyToken,
  upload.single("file"),
  async (req, res) => {

    try {

      // =========================
      // VALIDATE
      // =========================
      if (!req.file) {

        return res.status(400).json({
          message: "Không có file",
        });

      }

      // =========================
      // DATA
      // =========================
      const {
        message,
        conversationId,
      } = req.body;

      const userId =
        req.user.userId;

        const conversationCheck = await pool.query(
  `
  SELECT id
  FROM conversations
  WHERE id = $1
    AND created_by = $2
    AND type = 'ai'
  `,
  [conversationId, userId]
);

if (conversationCheck.rows.length === 0) {
  return res.status(403).json({
    message: "Không có quyền truy cập cuộc trò chuyện AI này",
  });
}

      // FIX UTF8 FILE NAME
      const originalName = safeFileName(
  decodeFileName(req.file.originalname)
);

      // =========================
      // READ FILE
      // =========================
      const content =
        await extractFileContent(req.file);

      // =========================
      // FINAL PROMPT
      // =========================
      const prompt = `
Bạn là trợ lý AI thông minh cho hệ thống quản lý công việc.

Người dùng yêu cầu:
"${message}"

Dưới đây là nội dung tài liệu:

${content}

Hãy thực hiện đúng yêu cầu người dùng.

Nếu người dùng yêu cầu:
- tóm tắt → hãy tóm tắt
- tạo task → hãy tạo task
- phân tích → hãy phân tích
- tìm thông tin → hãy tìm

Trả lời rõ ràng, dễ hiểu, chuyên nghiệp.
`;

      // =========================
      // SAVE USER MESSAGE
      // =========================
      await pool.query(
        `
        INSERT INTO messages
        (
          conversation_id,
          sender_id,
          content,
          role,
          file_name,
          file_url,
          file_type
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          conversationId,

          userId,

          message,

          "user",

          originalName,

          `/uploads/${req.file.filename}`,

          req.file.mimetype,
        ]
      );
      
      // =========================
      // AUTO RENAME CHAT
      // =========================
      const titleResult =
        await pool.query(
          `
          SELECT title
          FROM conversations
          WHERE id = $1
            AND created_by = $2
            AND type = 'ai'
          `,
          [conversationId, userId]
        );

      const currentTitle =
        titleResult.rows[0]?.title;

      if (!currentTitle) {

        const shortTitle =
          message.length > 40
            ? message.slice(0, 40) + "..."
            : message;

        await pool.query(
          `
          UPDATE conversations
          SET title = $1
          WHERE id = $2
            AND created_by = $3
            AND type = 'ai'
          `,
          [
            shortTitle,
            conversationId,
            userId,
          ]
        );

      }

      // =========================
      // CALL AI
      // =========================
      const reply = await callAI([
        {
          role: "user",
          content: prompt,
        },
      ]);

      // =========================
      // SAVE AI MESSAGE
      // =========================
      await pool.query(
        `
        INSERT INTO messages
        (
          conversation_id,
          sender_id,
          content,
          role
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          conversationId,
          null,
          reply,
          "assistant"
        ]
      );

      // =========================
      // RESPONSE
      // =========================
      res.json({

        result: reply,

        file: {

          name: originalName,

          url:
          `/uploads/${req.file.filename}`,
            

          type:
            req.file.mimetype,

        },

      });

    } catch (err) {

      console.error(
        "FILE ERROR:",
        err.response?.data || err.message
      );

      res.status(500).json({

        message: "AI error",

        error:
          err.response?.data || err.message,

      });

    }

  }
);

// ======================
// CREATE CONVERSATION
// ======================
router.post(
  "/conversation",
  verifyToken,
  async (req, res) => {

    try {

      const userId = req.user.userId;

      const result = await pool.query(
        `
        INSERT INTO conversations
        (created_by, type)
        VALUES ($1,$2)
        RETURNING *
        `,
        [userId, "ai"]
      );

      res.json(result.rows[0]);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: "Create conversation error",
      });

    }
});

// ======================
// GET CONVERSATIONS
// ======================
router.get(
  "/conversations",
  verifyToken,
  async (req, res) => {

    try {

      const userId = req.user.userId;

      const result = await pool.query(
        `
        SELECT *
        FROM conversations
        WHERE created_by = $1
          AND type = 'ai'
        ORDER BY created_at DESC
        `,
        [userId]
      );

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: "Get conversations error",
      });

    }
});

// ======================
// GET MESSAGES
// ======================
router.get(
  "/messages/:conversationId",
  verifyToken,
  async (req, res) => {

    try {

      const userId = req.user.userId;

      const { conversationId } =
        req.params;

      const result = await pool.query(
        `
        SELECT m.*
        FROM messages m

        JOIN conversations c
          ON m.conversation_id = c.id

        WHERE c.id = $1
          AND c.created_by = $2
          AND c.type = 'ai'

        ORDER BY m.created_at ASC
        `,
        [conversationId, userId]
      );

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: "Get messages error",
      });

    }
});

// ======================
// DELETE CONVERSATION
// ======================
router.delete(
  "/conversation/:id",
  verifyToken,
  async (req, res) => {

    try {

      const { id } = req.params;

      const userId =
        req.user.userId;

      // CHECK OWNER
      const check =
        await pool.query(
          `
          SELECT *
          FROM conversations
          WHERE id = $1
            AND created_by = $2
            AND type = 'ai'
          `,
          [id, userId]
        );

      if (
        check.rows.length === 0
      ) {
        return res.status(403).json({
          message: "Không có quyền",
        });
      }

      // DELETE MESSAGES
      await pool.query(
        `
        DELETE FROM messages
        WHERE conversation_id = $1
        `,
        [id]
      );

      // DELETE CONVERSATION
      await pool.query(
        `
        DELETE FROM conversations
        WHERE id = $1
        `,
        [id]
      );

      res.json({
        message:
          "Đã xóa conversation",
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: "Server error",
      });

    }

  }
);

// ======================
// CHAT AI - DATABASE GROUNDED
// ======================
router.post(
  "/chat",
  verifyToken,
  async (req, res) => {
    try {
      const {
        message,
        conversationId,
      } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          message: "Thiếu message",
        });
      }

      const userId = req.user.userId;

      const conversationCheck = await pool.query(
        `
        SELECT id
        FROM conversations
        WHERE id = $1
          AND created_by = $2
          AND type = 'ai'
        `,
        [conversationId, userId]
      );

      if (conversationCheck.rows.length === 0) {
        return res.status(403).json({
          message: "Không có quyền truy cập cuộc trò chuyện AI này",
        });
      }

      // =========================
      // SAVE USER MESSAGE
      // =========================
      await pool.query(
        `
        INSERT INTO messages
        (
          conversation_id,
          sender_id,
          content,
          role
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          conversationId,
          userId,
          message,
          "user",
        ]
      );

      // =========================
      // AUTO RENAME CHAT
      // =========================
      const titleResult = await pool.query(
        `
        SELECT title
        FROM conversations
        WHERE id = $1
          AND created_by = $2
          AND type = 'ai'
        `,
        [
          conversationId,
          userId,
        ]
      );

      const currentTitle =
        titleResult.rows[0]?.title;

      if (!currentTitle) {
        const shortTitle =
          message.length > 40
            ? message.slice(0, 40) + "..."
            : message;

        await pool.query(
          `
          UPDATE conversations
          SET title = $1
          WHERE id = $2
            AND created_by = $3
            AND type = 'ai'
          `,
          [
            shortTitle,
            conversationId,
            userId,
          ]
        );
      }

// =========================
// LEARN FROM USER MESSAGE
// =========================
const learningData =
  parseLearningMessage(message);

if (learningData) {
  const permissions =
    req.user.permissions || [];

  if (
    !permissions.includes("ai:manage") &&
    req.user.role !== "admin" &&
    req.user.role !== "lanh_dao"
  ) {
    const reply =
      "Bạn chưa có quyền bổ sung tri thức cho AI.";

    await pool.query(
      `
      INSERT INTO messages
      (
        conversation_id,
        sender_id,
        content,
        role
      )
      VALUES ($1,$2,$3,$4)
      `,
      [
        conversationId,
        null,
        reply,
        "assistant",
      ]
    );

    return res.json({
      reply,
      isAnswered: false,
      sources: {
        tasks: [],
        documents: [],
        knowledge: [],
      },
    });
  }

  const result = await pool.query(
    `
    INSERT INTO ai_knowledge_base
    (
      question,
      answer,
      topic,
      created_by
    )
    VALUES ($1,$2,$3,$4)
    RETURNING id
    `,
    [
      learningData.question,
      learningData.answer,
      learningData.topic,
      userId,
    ]
  );

  const reply =
    "Tôi đã ghi nhớ nội dung này. Từ lần sau, nếu người dùng hỏi nội dung liên quan, tôi sẽ dùng tri thức đã được bổ sung để trả lời.";

  await pool.query(
    `
    INSERT INTO messages
    (
      conversation_id,
      sender_id,
      content,
      role
    )
    VALUES ($1,$2,$3,$4)
    `,
    [
      conversationId,
      null,
      reply,
      "assistant",
    ]
  );

  return res.json({
    reply,
    isAnswered: true,
    sources: {
      tasks: [],
      documents: [],
      knowledge: [result.rows[0].id],
    },
  });
}


      // =========================
      // SEARCH DATABASE
      // =========================
      // =========================
// SMALL TALK
// =========================
const normalizedMessage = message.trim().toLowerCase();

const isGreeting =
  [
    "chào",
    "chào bạn",
    "xin chào",
    "hello",
    "hi",
    "hey",
    "alo",
  ].includes(normalizedMessage);

const isThanks =
  normalizedMessage.includes("cảm ơn") ||
  normalizedMessage.includes("cam on") ||
  normalizedMessage.includes("thank");

const isAskAbility =
  normalizedMessage.includes("bạn làm được gì") ||
  normalizedMessage.includes("ban lam duoc gi") ||
  normalizedMessage.includes("trợ lý ai") ||
  normalizedMessage.includes("tro ly ai");

if (isGreeting || isThanks || isAskAbility) {
  let reply = "";

  if (isGreeting) {
    reply =
      "Chào bạn, tôi là trợ lý AI của hệ thống. Tôi có thể hỗ trợ tra cứu nhiệm vụ, văn bản, báo cáo, hồ sơ lưu trữ và tóm tắt tài liệu bạn tải lên.";
  } else if (isThanks) {
    reply =
      "Không có gì, tôi luôn sẵn sàng hỗ trợ bạn tra cứu thông tin trong hệ thống.";
  } else {
    reply =
      "Tôi có thể hỗ trợ tra cứu nhiệm vụ, văn bản, báo cáo, hồ sơ lưu trữ và tóm tắt tài liệu tải lên. Với dữ liệu nghiệp vụ, tôi chỉ trả lời dựa trên thông tin có trong hệ thống.";
  }

  await pool.query(
    `
    INSERT INTO messages
    (
      conversation_id,
      sender_id,
      content,
      role
    )
    VALUES ($1,$2,$3,$4)
    `,
    [
      conversationId,
      null,
      reply,
      "assistant",
    ]
  );

  return res.json({
    reply,
    isAnswered: true,
    sources: {
      tasks: [],
      documents: [],
      knowledge: [],
    },
  });
}

// =========================
// FILE FOLLOW-UP
// =========================
const latestFile = await getLatestFileContext(
  conversationId,
  userId
);

if (
  latestFile &&
  isFileFollowUpQuestion(message)
) {
  const filePrompt = `
Bạn là trợ lý AI của hệ thống quản lý tiến độ thực hiện nhiệm vụ.

Người dùng đang hỏi tiếp về tài liệu đã tải lên trước đó.

Tên file:
${latestFile.fileName}

Yêu cầu của người dùng:
${message}

Nội dung tài liệu:
${latestFile.content}

Hãy trả lời CHỈ dựa trên nội dung tài liệu trên.
Không bịa thêm thông tin ngoài tài liệu.
Trả lời rõ ràng, ngắn gọn, dễ hiểu.
`;

  const reply = await callAI([
    {
      role: "user",
      content: filePrompt,
    },
  ]);

  await pool.query(
    `
    INSERT INTO messages
    (
      conversation_id,
      sender_id,
      content,
      role
    )
    VALUES ($1,$2,$3,$4)
    `,
    [
      conversationId,
      null,
      reply,
      "assistant",
    ]
  );

  return res.json({
    reply,
    isAnswered: true,
    sources: {
      tasks: [],
      documents: [],
      knowledge: [],
      file: latestFile.fileName,
    },
  });
}

// =========================
// SEARCH DATABASE
// =========================
const context = await searchSystemContext(
  message,
  req.user
);

let reply = "";
let isAnswered = true;

      // =========================
      // NO DATA FOUND
      // =========================
      if (!hasUsefulContext(context)) {
        reply =
          "Hiện tại hệ thống chưa có đủ dữ liệu để trả lời câu hỏi này.";

        isAnswered = false;

        await pool.query(
          `
          INSERT INTO ai_unanswered_questions
          (
            user_id,
            question,
            reason
          )
          VALUES ($1,$2,$3)
          `,
          [
            userId,
            message,
            "Không tìm thấy dữ liệu phù hợp trong database",
          ]
        );
      }

      // =========================
      // DATA FOUND -> CALL AI
      // =========================
      else {
        const systemPrompt = `
Bạn là trợ lý AI của hệ thống quản lý tiến độ thực hiện nhiệm vụ Đảng ủy phường Tam Thanh.

Bạn CHỈ được trả lời dựa trên dữ liệu trong CONTEXT.

Nếu CONTEXT không có thông tin phù hợp, bắt buộc trả lời:
"Hiện tại hệ thống chưa có đủ dữ liệu để trả lời câu hỏi này."

Quy tắc bắt buộc:
- Không được tự suy đoán.
- Không được bịa tên văn bản, nhiệm vụ, phòng ban, người thực hiện, ngày tháng hoặc trạng thái.
- Không trả lời thông tin ngoài phạm vi hệ thống.
- Nếu có dữ liệu liên quan, trả lời ngắn gọn, rõ ràng, đúng nghiệp vụ.
- Nếu liệt kê nhiệm vụ, mỗi dòng nên gồm: tên nhiệm vụ, phòng ban, người thực hiện, trạng thái, hạn chót và ngày hoàn thành nếu có.
- Nếu dữ liệu không có trường nào thì bỏ qua trường đó, không tự bịa.
- Không dùng các cụm như "có vẻ", "có thể", "theo suy đoán".
`;

        const userPrompt = `
CÂU HỎI:
${message}

CONTEXT:
${JSON.stringify(context, null, 2)}
`;

        reply = await callAI([
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ]);
      }

      // =========================
      // SAVE AI MESSAGE
      // =========================
      await pool.query(
        `
        INSERT INTO messages
        (
          conversation_id,
          sender_id,
          content,
          role
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          conversationId,
          null,
          reply,
          "assistant",
        ]
      );

      // =========================
      // RESPONSE
      // =========================
      res.json({
        reply,
        isAnswered,
        sources: {
  tasks: context.tasks.map((item) => item.id),
  documents: context.documents.map((item) => item.id),
  reports: context.reports.map((item) => item.id),
  kpis: context.kpis.map((item) => item.id),
  archives: context.archives.map((item) => item.id),
  knowledge: context.knowledge.map((item) => item.id),
},
      });
    } catch (err) {
      console.error(
        "CHAT ERROR:",
        err.response?.data || err.message
      );

      res.status(500).json({
        message: "AI error",
        error: err.response?.data || err.message,
      });
    }
  }
);

// ======================
// DOWNLOAD FILE
// ======================
router.get(
  "/download/:filename",
  async (req, res) => {

    try {

      const fileName =
        req.params.filename;

      const filePath = path.join(
        __dirname,
        "../../uploads",
        fileName
      );

      // REMOVE TIMESTAMP
      const originalName =
        fileName.replace(
          /^\d+-/,
          ""
        );

      res.download(
        filePath,
        originalName
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: "Download error",
      });

    }

  }
);


// ======================
// GET UNANSWERED QUESTIONS
// ======================
router.get(
  "/unanswered",
  verifyToken,
  async (req, res) => {
    try {
      const permissions = req.user.permissions || [];

      if (
        !permissions.includes("ai:manage") &&
        req.user.role !== "admin" &&
        req.user.role !== "lanh_dao"
      ) {
        return res.status(403).json({
          message: "Không có quyền xem câu hỏi chưa trả lời",
        });
      }

      const result = await pool.query(
        `
        SELECT
          q.*,
          u.full_name AS user_full_name,
          u.username AS username
        FROM ai_unanswered_questions q
        LEFT JOIN users u
          ON q.user_id = u.id
        ORDER BY q.created_at DESC
        `
      );

      res.json(result.rows);
    } catch (err) {
      console.error("GET UNANSWERED ERROR:", err);

      res.status(500).json({
        message: "Get unanswered questions error",
      });
    }
  }
);

// ======================
// ADD KNOWLEDGE
// ======================
router.post(
  "/knowledge",
  verifyToken,
  async (req, res) => {
    try {
      const permissions = req.user.permissions || [];

      if (
        !permissions.includes("ai:manage") &&
        req.user.role !== "admin" &&
        req.user.role !== "lanh_dao"
      ) {
        return res.status(403).json({
          message: "Không có quyền bổ sung tri thức AI",
        });
      }

      const {
        question,
        answer,
        topic,
        unansweredId,
      } = req.body;

      if (!question || !answer) {
        return res.status(400).json({
          message: "Thiếu câu hỏi hoặc câu trả lời",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO ai_knowledge_base
        (
          question,
          answer,
          topic,
          created_by
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
        [
          question,
          answer,
          topic || null,
          req.user.userId,
        ]
      );

      if (unansweredId) {
        await pool.query(
          `
          UPDATE ai_unanswered_questions
          SET status = 'answered',
              answered_at = NOW()
          WHERE id = $1
          `,
          [unansweredId]
        );
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("ADD KNOWLEDGE ERROR:", err);

      res.status(500).json({
        message: "Add knowledge error",
      });
    }
  }
);

module.exports = router;