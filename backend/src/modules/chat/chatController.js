const chatService = require("./chatService");
const { getIO } = require("../../config/socket");
const pool = require("../../config/db"); // 👈 thêm

exports.sendMessage = async (req, res) => {
  try {
    const { conversation_id, content } = req.body;
    // CHECK QUYỀN
    const isMember = await chatService.checkUserInConversation(
      conversation_id,
      req.user.userId
    );
    if (!isMember) {
  return res.status(403).json({
    message: "Không có quyền",
  });
}
// CHECK ĐÚNG PHÒNG CHAT TASK
const isTaskConversation =
  await chatService.checkTaskConversation(
    conversation_id
  );
if (!isTaskConversation) {
  return res.status(400).json({
    message: "Đây không phải phòng chat nhiệm vụ",
  });
}
//  LƯU MESSAGE
const message = await chatService.createMessage(
  conversation_id,
  req.user.userId,
  content
);
    // REALTIME CHAT
    const io = getIO();
    io.to(`room_${conversation_id}`).emit("receive_message", message);
    // THÊM NOTIFICATION=
    // 1 lấy member
    const members = await pool.query(
  `
  SELECT user_id
  FROM conversation_members
  WHERE conversation_id = $1
    AND is_active = true
  `,
  [conversation_id]
);

    // 2. gửi notification (trừ người gửi)
    // 2. gửi notification (trừ người gửi)
await Promise.all(
  members.rows
    .filter(m => m.user_id !== req.user.userId)
    .map(async (m) => {

      // 🔥 insert DB
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, content)
         VALUES ($1, 'chat_message', $2, $3)`,
        [
          m.user_id,
          `${message.username} đã gửi tin nhắn`,
          message.content
        ]
      );

      // 🔥 THÊM DÒNG NÀY (realtime notification)
      io.to(`user_${m.user_id}`).emit("new_notification", {
      type: "chat_message",
      title: `${message.username} đã gửi tin nhắn`,
      content: message.content,
      conversation_id,
    });

    })
);

    res.json(message);

  } catch (err) {
    res.status(500).json({ error: err.message });

  }
};

exports.markActive = async (req, res) => {
  try {
    const { conversation_id } = req.body;

    const isMember =
      await chatService.checkUserInConversation(
        conversation_id,
        req.user.userId
      );

    if (!isMember) {
      return res.status(403).json({
        message:
          "Không có quyền truy cập cuộc trò chuyện này",
      });
    }

    const isTaskConversation =
      await chatService.checkTaskConversation(
        conversation_id
      );

    if (!isTaskConversation) {
      return res.status(400).json({
        message: "Đây không phải phòng chat nhiệm vụ",
      });
    }

    await pool.query(
  `
  UPDATE conversation_members
  SET unread_count = 0
  WHERE conversation_id = $1
    AND user_id = $2
    AND is_active = true
  `,
  [conversation_id, req.user.userId]
);

    res.json({ message: "User active" });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// =======================
// MARK INACTIVE
// =======================
exports.markInactive = async (req, res) => {
  try {
    const { conversation_id } = req.body;

    // =======================
    // CHECK USER CÓ TRONG CHAT KHÔNG
    // =======================
    const isMember =
      await chatService.checkUserInConversation(
        conversation_id,
        req.user.userId
      );

    if (!isMember) {
      return res.status(403).json({
        message:
          "Không có quyền truy cập cuộc trò chuyện này",
      });
    }

    // =======================
    // CHECK ĐÂY CÓ PHẢI CHAT TASK KHÔNG
    // =======================
    const isTaskConversation =
      await chatService.checkTaskConversation(
        conversation_id
      );

    if (!isTaskConversation) {
      return res.status(400).json({
        message:
          "Đây không phải phòng chat nhiệm vụ",
      });
    }

    // =======================
    // MARK INACTIVE
    // =======================
    await pool.query(
  `
  UPDATE conversation_members
  SET unread_count = COALESCE(unread_count, 0)
  WHERE conversation_id = $1
    AND user_id = $2
  `,
  [conversation_id, req.user.userId]
);

    res.json({
      message: "User inactive",
    });
  } catch (err) {
    console.log("MARK INACTIVE ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversation_id } = req.params;

    const isMember =
      await chatService.checkUserInConversation(
        conversation_id,
        req.user.userId
      );

    if (!isMember) {
  return res.status(403).json({
    message:
      "Không có quyền xem cuộc trò chuyện này",
  });
}

// 🔥 CHECK ĐÚNG PHÒNG CHAT TASK
const isTaskConversation =
  await chatService.checkTaskConversation(
    conversation_id
  );

if (!isTaskConversation) {
  return res.status(400).json({
    message: "Đây không phải phòng chat nhiệm vụ",
  });
}

const messages =
  await chatService.getMessagesByConversation(
    conversation_id
  );

    // Khi đã mở chat thì reset unread
   await pool.query(
  `
  UPDATE conversation_members
  SET unread_count = 0
  WHERE conversation_id = $1
    AND user_id = $2
    AND is_active = true
  `,
  [conversation_id, req.user.userId]
);

    res.json(messages);
  } catch (err) {
    console.log("GET MESSAGES ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};