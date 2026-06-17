const pool = require("../../config/db");
const { createNotification } = require("../../utils/notificationHelper");
const { getIO } = require("../../config/socket");

const {
  decodeFileName,
  safeFileName,
} = require("../../utils/fileNameHelper");

const emitDocumentChanged = (action, documentId, extra = {}) => {
  try {
    getIO().emit("document:changed", {
      action,
      documentId,
      ...extra,
    });
  } catch (err) {
    console.log("EMIT DOCUMENT REALTIME ERROR:", err.message);
  }
};
const hasPermission = (user, permission) => {
  return (
    Array.isArray(user?.permissions) &&
    user.permissions.includes(permission)
  );
};

const getUserId = (user) => {
  return user?.userId || user?.id;
};

// =======================
// GET ALL DOCUMENTS
// =======================
exports.getDocuments = async (user, filters = {}) => {
  const userId = getUserId(user);
  const unitId = user.unit_id || null;

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(filters.limit) || 10, 1),
    100
  );
  const offset = (page - 1) * limit;

  const canRead =
    hasPermission(user, "document:read");

  const canViewAll =
    hasPermission(user, "document:view_all");

  const canViewUnit =
    hasPermission(user, "document:view_unit");

  const canViewRelated =
    hasPermission(user, "document:view_related");

  if (
    !canRead &&
    !canViewAll &&
    !canViewUnit &&
    !canViewRelated
  ) {
    throw new Error("Không có quyền xem văn bản");
  }

  let baseQuery = `
    FROM documents d

    LEFT JOIN document_types dt
      ON d.loai_van_ban_id = dt.id

    LEFT JOIN document_source_levels dsl
      ON d.cap_ban_hanh = dsl.code

    LEFT JOIN document_priorities dp
      ON d.muc_do_uu_tien = dp.code

    LEFT JOIN document_security_levels dsec
      ON d.muc_do_bao_mat = dsec.code

    LEFT JOIN users u
      ON d.created_by = u.id

    LEFT JOIN units un
      ON d.unit_id = un.id

    WHERE d.deleted_at IS NULL
  `;

  const values = [];

  if (
    filters.month &&
    /^\d{4}-\d{2}$/.test(filters.month)
  ) {
    values.push(`${filters.month}-01`);

    baseQuery += `
      AND d.ngay_nhan >= $${values.length}::date
      AND d.ngay_nhan < ($${values.length}::date + INTERVAL '1 month')
    `;
  }

  if (filters.keyword) {
    values.push(`%${filters.keyword.trim()}%`);

    baseQuery += `
      AND (
        d.tieu_de ILIKE $${values.length}
        OR d.so_ky_hieu ILIKE $${values.length}
        OR d.trich_yeu ILIKE $${values.length}
        OR d.don_vi_ban_hanh ILIKE $${values.length}
      )
    `;
  }

  if (!canViewAll) {
    values.push(userId);
    const userIdIndex = values.length;

    const accessConditions = [];

    accessConditions.push(
      `d.created_by = $${userIdIndex}`
    );

    if (canViewUnit && unitId) {
      values.push(unitId);
      const unitIdIndex = values.length;

      accessConditions.push(`
        (
          d.unit_id = $${unitIdIndex}
          OR EXISTS (
            SELECT 1
            FROM task_documents td
            JOIN tasks t
              ON td.task_id = t.id
            WHERE td.document_id = d.id
              AND t.deleted_at IS NULL
              AND t.unit_id = $${unitIdIndex}
          )
        )
      `);
    }

    if (canViewRelated) {
      accessConditions.push(`
        EXISTS (
          SELECT 1
          FROM task_documents td
          JOIN tasks t
            ON td.task_id = t.id
          LEFT JOIN subtasks s
            ON s.task_id = t.id
          WHERE td.document_id = d.id
            AND t.deleted_at IS NULL
            AND (
              t.assignee_user_id = $${userIdIndex}
              OR s.assignee_user_id = $${userIdIndex}
            )
        )
      `);
    }

    baseQuery += `
      AND (
        ${accessConditions.join(" OR ")}
      )
    `;
  }

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    ${baseQuery}
    `,
    values
  );

  const total = countResult.rows[0]?.total || 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const dataValues = [...values, limit, offset];

  const result = await pool.query(
    `
    SELECT
      d.*,

      dt.name AS loai_van_ban_name,
      dsl.name AS cap_ban_hanh_name,
      dp.name AS muc_do_uu_tien_name,
      dsec.name AS muc_do_bao_mat_name,

      COALESCE(u.full_name, u.username) AS created_by_name,

      un.name AS unit_name

    ${baseQuery}

    ORDER BY d.created_at DESC
    LIMIT $${dataValues.length - 1}
    OFFSET $${dataValues.length}
    `,
    dataValues
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

exports.getDocumentById = async (id, user) => {
  const userId = getUserId(user);
  const unitId = user.unit_id || null;

  const result = await pool.query(
    `
    SELECT
      d.*,

      dt.name AS loai_van_ban_name,

      dsl.name AS cap_ban_hanh_name,

      dp.name AS muc_do_uu_tien_name,

      dsec.name AS muc_do_bao_mat_name,

      COALESCE(u.full_name, u.username) AS created_by_name,

      un.name AS unit_name

    FROM documents d

    LEFT JOIN document_types dt
      ON d.loai_van_ban_id = dt.id

    LEFT JOIN document_source_levels dsl
      ON d.cap_ban_hanh = dsl.code

    LEFT JOIN document_priorities dp
      ON d.muc_do_uu_tien = dp.code

    LEFT JOIN document_security_levels dsec
      ON d.muc_do_bao_mat = dsec.code

    LEFT JOIN users u
      ON d.created_by = u.id

    LEFT JOIN units un
      ON d.unit_id = un.id

    WHERE d.id = $1
      AND d.deleted_at IS NULL
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Văn bản không tồn tại");
  }

  const document = result.rows[0];

  const canRead =
    hasPermission(user, "document:read");

  const canViewAll =
    hasPermission(user, "document:view_all");

  const canViewUnit =
    hasPermission(user, "document:view_unit");

  const canViewRelated =
    hasPermission(user, "document:view_related");

  if (
    !canRead &&
    !canViewAll &&
    !canViewUnit &&
    !canViewRelated
  ) {
    throw new Error("Không có quyền xem văn bản này");
  }

  // 1. Xem tất cả
  if (canViewAll) {
    return document;
  }

  // 2. Người tạo văn bản
  if (document.created_by === userId) {
    return document;
  }

  // 3. Xem theo đơn vị/phòng ban
  if (canViewUnit) {
    if (document.unit_id === unitId) {
      return document;
    }

    const unitRelated = await pool.query(
      `
      SELECT 1
      FROM task_documents td
      JOIN tasks t
        ON td.task_id = t.id
      WHERE td.document_id = $1
        AND t.deleted_at IS NULL
        AND t.unit_id = $2
      LIMIT 1
      `,
      [id, unitId]
    );

    if (unitRelated.rows.length > 0) {
      return document;
    }
  }

  // 4. Xem văn bản liên quan task/subtask của mình
  if (canViewRelated) {
    const related = await pool.query(
      `
      SELECT 1
      FROM task_documents td
      JOIN tasks t
        ON td.task_id = t.id
      LEFT JOIN subtasks s
        ON s.task_id = t.id
      WHERE td.document_id = $1
        AND t.deleted_at IS NULL
        AND (
          t.assignee_user_id = $2
          OR s.assignee_user_id = $2
        )
      LIMIT 1
      `,
      [id, userId]
    );

    if (related.rows.length > 0) {
      return document;
    }
  }

  throw new Error("Không có quyền xem văn bản này");
};

// =======================
// CREATE DOCUMENT
// =======================
exports.createDocument = async (data, user, file) => {
  const {
    so_ky_hieu,
    tieu_de,
    trich_yeu,
    loai_van_ban_id,
    muc_do_uu_tien,
    muc_do_bao_mat,
    cap_ban_hanh,
    don_vi_ban_hanh,
    nguoi_ky,
    ngay_ban_hanh,
    ngay_nhan,
    han_xu_ly,
    unit_id,
  } = data;

  if (!tieu_de) {
    throw new Error("Thiếu tiêu đề văn bản");
  }
  if (!hasPermission(user, "document:create")) {
  throw new Error("Không có quyền tạo văn bản");
  }

  const finalUnitId =
  unit_id || user.unit_id || null;

const fileName = file
  ? safeFileName(decodeFileName(file.originalname))
  : null;
const filePath = file
  ? `/uploads/${file.filename}`
  : null;

const fileType = file
  ? file.mimetype
  : null;

const result = await pool.query(
  `
  INSERT INTO documents
  (
    so_ky_hieu,
    tieu_de,
    trich_yeu,
    loai_van_ban_id,
    muc_do_uu_tien,
    muc_do_bao_mat,
    cap_ban_hanh,
    don_vi_ban_hanh,
    nguoi_ky,
    ngay_ban_hanh,
    ngay_nhan,
    han_xu_ly,
    file_name,
    file_path,
    file_type,
    created_by,
    unit_id,
    status,
    workflow_status
  )
  VALUES
  (
    $1,$2,$3,$4,$5,
    $6,$7,$8,$9,$10,
    $11,$12,$13,$14,$15,
    $16,$17,$18,$19
  )
  RETURNING *
  `,
  [
  so_ky_hieu || null,
  tieu_de,
  trich_yeu || null,
  loai_van_ban_id || null,
  muc_do_uu_tien || "binh_thuong",
  muc_do_bao_mat || "noi_bo",
  cap_ban_hanh || "noi_bo",
  don_vi_ban_hanh || null,
  nguoi_ky || null,
  ngay_ban_hanh || null,
  ngay_nhan || null,
  null,
  fileName,
  filePath,
  fileType,
  user.userId,
  finalUnitId,
  "moi",
  "draft",
]
);

const document = result.rows[0];

emitDocumentChanged("created", document.id, {
  unitId: document.unit_id,
  createdBy: document.created_by,
  workflowStatus: document.workflow_status,
});

return document;
};


// =======================
// UPDATE DOCUMENT
// =======================
exports.updateDocument = async (
  id,
  data = {},
  user,
  file = null
) => {
  if (!hasPermission(user, "document:update")) {
    throw new Error("Không có quyền cập nhật văn bản");
  }

  const currentDocument = await exports.getDocumentById(id, user);

const editableStatuses = ["draft", "office_rejected"];

if (!editableStatuses.includes(currentDocument.workflow_status)) {
  throw new Error(
    "Văn bản đã được duyệt hoặc đã trình lãnh đạo, không thể chỉnh sửa"
  );
}

  const {
    so_ky_hieu,
    tieu_de,
    trich_yeu,
    loai_van_ban_id,
    muc_do_uu_tien,
    muc_do_bao_mat,
    cap_ban_hanh,
    don_vi_ban_hanh,
    nguoi_ky,
    ngay_ban_hanh,
    ngay_nhan,
    unit_id,
    status,
  } = data || {};

  const fileName = file
    ? safeFileName(decodeFileName(file.originalname))
    : null;

  const filePath = file
  ? `/uploads/${file.filename}`
  : null;

  const fileType = file
    ? file.mimetype
    : null;

  let query = `
    UPDATE documents
    SET
      so_ky_hieu = $1,
      tieu_de = $2,
      trich_yeu = $3,
      loai_van_ban_id = $4,
      muc_do_uu_tien = $5,
      muc_do_bao_mat = $6,
      cap_ban_hanh = $7,
      don_vi_ban_hanh = $8,
      nguoi_ky = $9,
      ngay_ban_hanh = $10,
      ngay_nhan = $11,
      han_xu_ly = $12,
      unit_id = $13,
      status = $14,
      updated_at = NOW()
  `;

  const values = [
    so_ky_hieu || null,
    tieu_de,
    trich_yeu || null,
    loai_van_ban_id || null,
    muc_do_uu_tien || "binh_thuong",
    muc_do_bao_mat || "noi_bo",
    cap_ban_hanh || "noi_bo",
    don_vi_ban_hanh || null,
    nguoi_ky || null,
    ngay_ban_hanh || null,
    ngay_nhan || null,
    null,
    unit_id || user.unit_id || null,
    status || "moi",
  ];

  if (file) {
    query += `,
      file_name = $15,
      file_path = $16,
      file_type = $17
      WHERE id = $18
      RETURNING *
    `;

    values.push(fileName, filePath, fileType, id);
  } else {
    query += `
      WHERE id = $15
      RETURNING *
    `;

    values.push(id);
  }

  const result = await pool.query(query, values);

  const document = result.rows[0];

  emitDocumentChanged("updated", document.id, {
    unitId: document.unit_id,
    workflowStatus: document.workflow_status,
  });

  return document;
};

// =======================
// DELETE DOCUMENT
// =======================
exports.deleteDocument = async (id, user) => {
  if (!hasPermission(user, "document:delete")) {
    throw new Error("Không có quyền xóa văn bản");
  }

  await exports.getDocumentById(id, user);

 await pool.query(
  `
  UPDATE documents
  SET deleted_at = NOW()
  WHERE id = $1
  `,
  [id]
);

emitDocumentChanged("deleted", id, {
  byUserId: getUserId(user),
});

return true;
};

// =======================
// GET DOCUMENT TYPES
// =======================
exports.getDocumentTypes = async () => {
  const result = await pool.query(
    `
    SELECT *
    FROM document_types
    ORDER BY name ASC
    `
  );

  return result.rows;
};

// =======================
// GET SOURCE LEVELS
// =======================
exports.getSourceLevels = async () => {
  const result = await pool.query(
    `
    SELECT *
    FROM document_source_levels
    ORDER BY id ASC
    `
  );

  return result.rows;
};

// =======================
// GET PRIORITIES
// =======================
exports.getPriorities = async () => {
  const result = await pool.query(
    `
    SELECT *
    FROM document_priorities
    ORDER BY id ASC
    `
  );

  return result.rows;
};

// =======================
// GET SECURITY LEVELS
// =======================
exports.getSecurityLevels = async () => {
  const result = await pool.query(
    `
    SELECT *
    FROM document_security_levels
    ORDER BY id ASC
    `
  );

  return result.rows;
};
exports.getTasksByDocumentId = async (documentId, user) => {
  // Kiểm tra quyền xem văn bản trước
  await exports.getDocumentById(documentId, user);

  const result = await pool.query(
  `
  SELECT
    t.id,
    t.tieu_de,
    t.mo_ta,
    t.han_chot,
    t.unit_id,
    t.priority_score,
    t.priority_level,
    t.priority_reason,
    un.name AS unit_name,
    tt.code AS status_code,
    tt.name AS status_name,
    td.relation_type,
    td.created_at AS linked_at
  FROM task_documents td
  JOIN tasks t
    ON td.task_id = t.id
  LEFT JOIN units un
    ON t.unit_id = un.id
  JOIN trang_thai_task tt
    ON t.trang_thai_id = tt.id
  WHERE td.document_id = $1
    AND t.deleted_at IS NULL
  ORDER BY td.created_at DESC
  `,
  [documentId]
);

  return result.rows;
};
// =======================
// SUBMIT FOR OFFICE REVIEW
// Văn thư gửi văn bản cho Chánh văn phòng duyệt
// =======================
exports.submitForOfficeReview = async (documentId, user) => {
  const userId = getUserId(user);

  if (!hasPermission(user, "document:submit_for_review")) {
    throw new Error("Không có quyền gửi văn bản duyệt");
  }

  const document = await exports.getDocumentById(
    documentId,
    user
  );

  if (Number(document.created_by) !== Number(userId)) {
    throw new Error("Chỉ người tạo văn bản mới được gửi duyệt");
  }

  if (
    !["draft", "office_rejected"].includes(
      document.workflow_status
    )
  ) {
    throw new Error("Văn bản không ở trạng thái có thể gửi duyệt");
  }

  const result = await pool.query(
    `
    UPDATE documents
    SET workflow_status = 'waiting_office_review',
        submitted_to_office_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [documentId]
  );

  // Notify người có quyền duyệt văn phòng trong cùng đơn vị
  const reviewers = await pool.query(
    `
    SELECT DISTINCT u.id
    FROM users u
    JOIN role_permissions rp
      ON rp.role_id = u.role_id
    WHERE rp.permission = 'document:office_review'
      AND u.unit_id = $1
      AND u.id <> $2
    `,
    [
      document.unit_id || user.unit_id,
      userId,
    ]
  );

  await Promise.all(
    reviewers.rows.map((reviewer) =>
      createNotification({
        userId: reviewer.id,
        type: "document_submitted_for_review",
        title: "Có văn bản chờ duyệt",
        content: `Văn bản: ${document.tieu_de}`,
        documentId,
      })
    )
  );

  const updatedDocument = result.rows[0];

emitDocumentChanged("submitted_for_review", documentId, {
  unitId: updatedDocument.unit_id,
  workflowStatus: updatedDocument.workflow_status,
  byUserId: userId,
});

return updatedDocument;
};

// =======================
// OFFICE APPROVE DOCUMENT
// Chánh văn phòng duyệt văn bản
// =======================
exports.officeApproveDocument = async (
  documentId,
  data,
  user
) => {
  const userId = getUserId(user);

  if (!hasPermission(user, "document:office_review")) {
    throw new Error("Không có quyền duyệt văn bản");
  }

  const document = await exports.getDocumentById(
    documentId,
    user
  );

  if (document.workflow_status !== "waiting_office_review") {
    throw new Error("Văn bản chưa ở trạng thái chờ duyệt");
  }

  if (
    document.unit_id &&
    user.unit_id &&
    Number(document.unit_id) !== Number(user.unit_id)
  ) {
    throw new Error("Không thể duyệt văn bản ngoài đơn vị");
  }

  const result = await pool.query(
    `
    UPDATE documents
    SET workflow_status = 'office_approved',
        office_reviewer_id = $1,
        office_reviewed_at = NOW(),
        office_review_note = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [
      userId,
      data?.note || null,
      documentId,
    ]
  );

  if (document.created_by) {
    await createNotification({
      userId: document.created_by,
      type: "document_office_approved",
      title: "Văn bản đã được Chánh văn phòng duyệt",
      content: `Văn bản: ${document.tieu_de}`,
      documentId,
    });
  }

  const updatedDocument = result.rows[0];

emitDocumentChanged("office_approved", documentId, {
  unitId: updatedDocument.unit_id,
  workflowStatus: updatedDocument.workflow_status,
  byUserId: userId,
});

return updatedDocument;
};

// =======================
// OFFICE REJECT DOCUMENT
// Chánh văn phòng trả lại văn bản
// =======================
exports.officeRejectDocument = async (
  documentId,
  data,
  user
) => {
  const userId = getUserId(user);

  if (!hasPermission(user, "document:office_review")) {
    throw new Error("Không có quyền trả lại văn bản");
  }

  const document = await exports.getDocumentById(
    documentId,
    user
  );

  if (document.workflow_status !== "waiting_office_review") {
    throw new Error("Văn bản chưa ở trạng thái chờ duyệt");
  }

  if (
    document.unit_id &&
    user.unit_id &&
    Number(document.unit_id) !== Number(user.unit_id)
  ) {
    throw new Error("Không thể trả lại văn bản ngoài đơn vị");
  }

  const result = await pool.query(
    `
    UPDATE documents
    SET workflow_status = 'office_rejected',
        office_reviewer_id = $1,
        office_reviewed_at = NOW(),
        office_review_note = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [
      userId,
      data?.note || "Văn bản cần chỉnh sửa",
      documentId,
    ]
  );

  if (document.created_by) {
    await createNotification({
      userId: document.created_by,
      type: "document_office_rejected",
      title: "Văn bản bị trả lại",
      content: `Văn bản: ${document.tieu_de}`,
      documentId,
    });
  }

  const updatedDocument = result.rows[0];

emitDocumentChanged("office_rejected", documentId, {
  unitId: updatedDocument.unit_id,
  workflowStatus: updatedDocument.workflow_status,
  byUserId: userId,
});

return updatedDocument;
};

// =======================
// SEND DOCUMENT TO LEADER
// Chánh văn phòng gửi văn bản lên lãnh đạo
// =======================
exports.sendDocumentToLeader = async (documentId, user) => {
  const userId = getUserId(user);

  if (!hasPermission(user, "document:send_to_leader")) {
    throw new Error("Không có quyền gửi văn bản lên lãnh đạo");
  }

  const document = await exports.getDocumentById(
    documentId,
    user
  );

  if (document.workflow_status !== "office_approved") {
    throw new Error("Văn bản chưa được Chánh văn phòng duyệt");
  }

  if (
    document.unit_id &&
    user.unit_id &&
    Number(document.unit_id) !== Number(user.unit_id)
  ) {
    throw new Error("Không thể gửi văn bản ngoài đơn vị");
  }

  const result = await pool.query(
    `
    UPDATE documents
    SET workflow_status = 'sent_to_leader',
        sent_to_leader_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [documentId]
  );

  const leaders = await pool.query(
    `
    SELECT DISTINCT u.id
    FROM users u
    JOIN role_permissions rp
      ON rp.role_id = u.role_id
    WHERE rp.permission = 'document:create_task'
      AND u.id <> $1
    `,
    [userId]
  );

  await Promise.all(
    leaders.rows.map((leader) =>
      createNotification({
        userId: leader.id,
        type: "document_sent_to_leader",
        title: "Có văn bản mới được trình lãnh đạo",
        content: `Văn bản: ${document.tieu_de}`,
        documentId,
      })
    )
  );

  const updatedDocument = result.rows[0];

emitDocumentChanged("sent_to_leader", documentId, {
  unitId: updatedDocument.unit_id,
  workflowStatus: updatedDocument.workflow_status,
  byUserId: userId,
});

return updatedDocument;
};