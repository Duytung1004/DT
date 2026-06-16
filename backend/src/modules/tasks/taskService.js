const pool = require("../../config/db");
const { createNotification } = require("../../utils/notificationHelper");
const {
  createLog,
} = require("../../services/taskLogService");

const { getIO } = require("../../config/socket");

const {
  decodeFileName,
  safeFileName,
} = require("../../utils/fileNameHelper");
const {
  calculateTaskPriority,
} = require("../../utils/priorityHelper");

const emitTaskChanged = (action, taskId, extra = {}) => {
  try {
    getIO().emit("task:changed", {
      action,
      taskId,
      ...extra,
    });

    getIO().emit(`task:${action}`, {
      taskId,
      ...extra,
    });
  } catch (err) {
    console.log("EMIT TASK REALTIME ERROR:", err.message);
  }
};
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
// =======================
// GET ALL TASKS (RBAC)
// =======================
exports.getTasks = async (user, filters = {}) => {
  const currentUserId = user.userId || user.id;

  let values = [
    user.role,
    currentUserId,
  ];

  let query = `
    SELECT 
      t.*,

      tt.code AS status_code,
      tt.name AS status_name,

      CASE
        -- Quá hạn luôn ưu tiên, trừ khi task chính đã hoàn thành
        WHEN t.han_chot < CURRENT_DATE
          AND tt.code <> 'hoan_thanh'
        THEN 'qua_han'

        -- Lãnh đạo/admin xem trạng thái task chính
        WHEN $1 IN ('lanh_dao', 'admin')
        THEN tt.code

        -- Trưởng phòng xem trạng thái cần xử lý ở cấp phòng
        WHEN $1 = 'truong_phong'
        THEN
          CASE
            -- Các trạng thái task chính quan trọng thì giữ nguyên
            WHEN tt.code IN (
              'cho_xac_nhan_don_vi',
              'da_giao_nhiem_vu',
              'cho_duyet_cap_1',
              'cho_duyet_cap_2',
              'hoan_thanh',
              'yeu_cau_chinh_sua'
            )
            THEN tt.code

            -- Nếu có phần việc chờ duyệt thì trưởng phòng cần thấy
            WHEN COALESCE(st.pending_review_subtasks, 0) > 0
            THEN 'cho_duyet'

            WHEN COALESCE(st.revision_subtasks, 0) > 0
            THEN 'yeu_cau_chinh_sua'

            WHEN COALESCE(st.doing_subtasks, 0) > 0
            THEN 'dang_thuc_hien'

            WHEN COALESCE(st.waiting_subtasks, 0) > 0
            THEN 'cho_nhan_viec'

            ELSE tt.code
          END

        -- Nhân viên xem trạng thái phần việc của chính mình
        WHEN $1 = 'nhan_vien'
        THEN
          CASE
            -- Nếu task chính đã lên luồng duyệt tổng thể thì cho nhân viên thấy
            WHEN tt.code IN (
              'cho_duyet_cap_1',
              'cho_duyet_cap_2',
              'hoan_thanh',
              'yeu_cau_chinh_sua'
            )
            THEN tt.code

            WHEN COALESCE(my_st.pending_review_subtasks, 0) > 0
            THEN 'cho_duyet'

            WHEN COALESCE(my_st.revision_subtasks, 0) > 0
            THEN 'yeu_cau_chinh_sua'

            WHEN COALESCE(my_st.doing_subtasks, 0) > 0
            THEN 'dang_thuc_hien'

            WHEN COALESCE(my_st.waiting_subtasks, 0) > 0
            THEN 'cho_nhan_viec'

            WHEN COALESCE(my_st.done_subtasks, 0) > 0
            THEN 'hoan_thanh'

            ELSE tt.code
          END

        ELSE tt.code
      END AS display_status_code,

      u.full_name AS assignee_name,

      un.name AS unit_name

    FROM tasks t

    JOIN trang_thai_task tt 
      ON t.trang_thai_id = tt.id

    LEFT JOIN users u
      ON t.assignee_user_id = u.id

    LEFT JOIN units un
      ON t.unit_id = un.id

    -- Tổng hợp tất cả phần việc của task
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'hoan_thanh'
        )::int AS done_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'cho_duyet'
        )::int AS pending_review_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'yeu_cau_chinh_sua'
        )::int AS revision_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'dang_thuc_hien'
        )::int AS doing_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'cho_nhan_viec'
        )::int AS waiting_subtasks

      FROM subtasks s
      WHERE s.task_id = t.id
    ) st ON true

    -- Tổng hợp phần việc của riêng nhân viên đang đăng nhập
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'hoan_thanh'
        )::int AS done_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'cho_duyet'
        )::int AS pending_review_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'yeu_cau_chinh_sua'
        )::int AS revision_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'dang_thuc_hien'
        )::int AS doing_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'cho_nhan_viec'
        )::int AS waiting_subtasks

      FROM subtasks s
      WHERE s.task_id = t.id
        AND s.assignee_user_id = $2
    ) my_st ON true

    WHERE t.deleted_at IS NULL
  `;
    if (filters.month) {
    values.push(`${filters.month}-01`);

    query += `
      AND t.han_chot >= $${values.length}::date
      AND t.han_chot < ($${values.length}::date + INTERVAL '1 month')
    `;
  }

  // ADMIN / LÃNH ĐẠO → xem tất cả
  if (user.permissions.includes("task:view_all")) {
    // không filter
  }

  // TRƯỞNG PHÒNG → xem theo đơn vị
  else if (
    user.permissions.includes("task:view_unit") &&
    user.unit_id
  ) {
    values.push(user.unit_id);
    query += ` AND t.unit_id = $${values.length}`;
  }

  // NHÂN VIÊN → thấy task được giao trực tiếp hoặc có subtask của mình
  else {
    values.push(currentUserId);
    query += `
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

  query += `
  ORDER BY t.han_chot ASC, t.created_at DESC
`;

  console.log("QUERY:", query);
  console.log("VALUES:", values);

  const result = await pool.query(query, values);
  return result.rows;
};

// =======================
// GET TASK BY ID
// =======================
exports.getTaskById = async (taskId, user) => {

  const result = await pool.query(
    `
    SELECT
      t.*,

      tt.code AS status_code,
      tt.name AS status_name,

      un.name AS unit_name,

      u.full_name AS assignee_name

    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN units un
      ON t.unit_id = un.id

    LEFT JOIN users u
      ON t.assignee_user_id = u.id

    WHERE t.id = $1
    AND t.deleted_at IS NULL
    `,
    [taskId]
  );

  if (result.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = result.rows[0];

  // =======================
  // GET LINKED DOCUMENTS
  // =======================
  const documentRes = await pool.query(
    `
    SELECT
      d.id,
      d.so_ky_hieu,
      d.tieu_de,
      d.trich_yeu,
      d.file_name,
      d.file_path,
      d.file_type,
      td.relation_type
    FROM task_documents td
    JOIN documents d
      ON td.document_id = d.id
    WHERE td.task_id = $1
      AND d.deleted_at IS NULL
    ORDER BY td.created_at DESC
    `,
    [taskId]
  );

  task.documents = documentRes.rows;

  // 🔥 ADMIN → xem tất cả
  if (user.permissions.includes("task:view_all")) {
    return task;
  }

  // 🔥 LEADER → xem trong unit
  if (
    user.permissions.includes("task:view_unit") &&
    Number(task.unit_id) === Number(user.unit_id)
  ) {
    return task;
  }

  // 🔥 NHÂN VIÊN → chỉ xem task của mình
  // 🔥 NHÂN VIÊN → xem nếu là assignee task chính
if (
  Number(task.assignee_user_id) ===
  Number(user.userId || user.id)
) {
  return task;
}

// 🔥 NHÂN VIÊN → xem nếu có phần việc nội bộ của mình
const currentUserId = user.userId || user.id;

const ownSubtaskCheck = await pool.query(
  `
  SELECT id
  FROM subtasks
  WHERE task_id = $1
    AND assignee_user_id = $2
  LIMIT 1
  `,
  [taskId, currentUserId]
);

if (ownSubtaskCheck.rows.length > 0) {
  return task;
}

// ❌ không có quyền
throw new Error("Không có quyền xem task này");
};

// =======================
// UPDATE TASK
// =======================
exports.updateTask = async (taskId, data, user) => {
  const { tieu_de, mo_ta, han_chot } = data;

  // kiểm tra task tồn tại
  const taskCheck = await pool.query(
  `
  SELECT 
    t.*,
    tt.code AS status_code
  FROM tasks t
  JOIN trang_thai_task tt
    ON t.trang_thai_id = tt.id
  WHERE t.id = $1
  `,
  [taskId]
  );

  const task = taskCheck.rows[0];
  if (!task) throw new Error("Task không tồn tại");

  // RBAC
if (!user.permissions.includes("task:update")) {
  throw new Error("Không có quyền sửa nhiệm vụ");
}

// Trưởng phòng chỉ được sửa nhiệm vụ thuộc phòng mình
if (
  user.roleId === 3 &&
  task.unit_id !== user.unit_id
) {
  throw new Error("Không được sửa nhiệm vụ ngoài phòng ban");
}

  const result = await pool.query(
    `UPDATE tasks
     SET tieu_de=$1,
         mo_ta=$2,
         han_chot=$3,
         updated_at=NOW()
     WHERE id=$4
     RETURNING *`,
    [tieu_de, mo_ta, han_chot, taskId]
  );
  await createLog(
  taskId,
  user.userId,
  "Cập nhật thông tin nhiệm vụ"
);

emitTaskChanged("updated", taskId, {
  byUserId: user.userId || user.id,
});

return result.rows[0];
};


// =======================
// DELETE TASK (SOFT DELETE)
// =======================
exports.deleteTask = async (taskId, user) => {
  if (!user.permissions.includes("task:delete")) {
    throw new Error("Không có quyền xóa nhiệm vụ");
  }
  await pool.query(
    `
    UPDATE tasks
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    `,
    [taskId]
  );

  await createLog(
  taskId,
  user.userId,
  "Xóa nhiệm vụ"
);

emitTaskChanged("deleted", taskId, {
  byUserId: user.userId || user.id,
});

return true;
};


// =======================
// ASSIGN TASK
// =======================
exports.assignTask = async (taskId, assigneeId, user) => {

  // 🔥 kiểm tra quyền (tạm giữ roleId, sau nâng cấp permission)
  if (!user.permissions.includes("task:assign")) {
    throw new Error("Không có quyền giao việc");
  }

  // 🔥 kiểm tra task tồn tại
  const check = await pool.query(
    `SELECT * FROM tasks WHERE id=$1`,
    [taskId]
  );

  if (check.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = check.rows[0];

  // 🔥 kiểm tra user được giao tồn tại
  const userCheck = await pool.query(
    `SELECT unit_id FROM users WHERE id=$1`,
    [assigneeId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error("User không tồn tại");
  }

  // 🔥 check cùng phòng (CỰC QUAN TRỌNG)
  if (userCheck.rows[0].unit_id !== task.unit_id) {
    throw new Error("Không thể giao việc khác phòng");
  }

  // 🔥 update task
  // 🔥 lấy id của status 'dang_thuc_hien'
    const status = await pool.query(
      "SELECT id FROM trang_thai_task WHERE code = 'cho_nhan_viec'"
    );

    // 🔥 update task
    const result = await pool.query(
      `UPDATE tasks 
      SET assignee_user_id=$1,
          trang_thai_id=$2
      WHERE id=$3
      RETURNING *`,
      [assigneeId, status.rows[0].id, taskId]
    );
  // =======================
// 🔥 ADD ASSIGNEE TO CONVERSATION
// =======================
// =======================
// TẠO / LẤY CHAT TRƯỞNG PHÒNG ↔ NHÂN VIÊN
// =======================
let convo = await pool.query(
  `
  SELECT id
  FROM conversations
  WHERE task_id = $1
    AND type = 'task'
    AND scope = 'unit_employee'
  `,
  [taskId]
);

let conversationId;

if (convo.rows.length === 0) {
  const newConvo = await pool.query(
    `
    INSERT INTO conversations
    (
      task_id,
      created_by,
      type,
      scope
    )
    VALUES ($1, $2, 'task', 'unit_employee')
    RETURNING id
    `,
    [taskId, user.userId]
  );

  conversationId = newConvo.rows[0].id;
} else {
  conversationId = convo.rows[0].id;
}

// thêm trưởng phòng vào chat nhân viên
await pool.query(
  `
  INSERT INTO conversation_members
  (
    conversation_id,
    user_id,
    is_active
  )
  VALUES ($1, $2, true)
ON CONFLICT (conversation_id, user_id)
DO UPDATE SET is_active = true
  `,
  [conversationId, user.userId]
);

// thêm nhân viên được giao vào chat
await pool.query(
  `
  INSERT INTO conversation_members
  (
    conversation_id,
    user_id,
    is_active
  )
  VALUES ($1, $2, true)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET is_active = true
  `,
  [conversationId, assigneeId]
);

  // 🔥 gửi thông báo
  await createNotification({
  userId: assigneeId,
  type: "task_assigned_user",
  title: `Bạn được phân công nhiệm vụ: ${task.tieu_de}`,
  taskId,
});

await createLog(
  taskId,
  user.userId,
  "Phân công cán bộ thực hiện"
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "assigned",
  assigneeId,
  byUserId: user.userId || user.id,
});

return result.rows[0];
};

// =======================
// CREATE TASK
// =======================
exports.createTask = async (data, user) => {
  if (!user.permissions.includes("task:create")) {
    throw new Error("Không có quyền tạo nhiệm vụ");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
  tieu_de,
  mo_ta,
  muc_do,
  han_chot,
  document_id,
  chu_ky_bao_cao,
} = data;
if (
  document_id &&
  !user.permissions.includes("document:create_task")
) {
  throw new Error("Không có quyền tạo nhiệm vụ từ văn bản");
}
    // AUTO UNIT FOR MANAGER
if (
  user.role ===
  "truong_phong"
) {
  data.unit_id =
    user.unit_id;
}
// BASIC VALIDATE
if (
  !tieu_de ||
  !han_chot
) {
  throw new Error(
    "Thiếu thông tin nhiệm vụ"
  );
}
// LEADER MUST CHOOSE UNIT
if (
  user.role ===
  "lanh_dao"
) {

 if (!data.unit_id)  {

    throw new Error(
      "Chọn phòng ban"
    );

  }

}
  // 🔥 lấy status mặc định
const statusResult =
  await client.query(
    `
    SELECT id
    FROM trang_thai_task
    WHERE code =
    'cho_xac_nhan_don_vi'
    `
  );
const statusId =
  statusResult.rows[0].id;

  let documentTypeInfo = null;

if (document_id) {
  const docTypeRes = await client.query(
    `
    SELECT
      d.id,
      d.workflow_status,
      dt.name AS document_type_name,
      COALESCE(dt.priority_weight, 10) AS priority_weight
    FROM documents d
    LEFT JOIN document_types dt
      ON d.loai_van_ban_id = dt.id
    WHERE d.id = $1
      AND d.deleted_at IS NULL
    `,
    [document_id]
  );

  if (docTypeRes.rows.length === 0) {
    throw new Error("Văn bản không tồn tại");
  }

  documentTypeInfo = docTypeRes.rows[0];

  if (documentTypeInfo.workflow_status !== "sent_to_leader") {
    throw new Error(
      "Văn bản chưa được trình lãnh đạo, không thể tạo nhiệm vụ"
    );
  }
}

const priority = calculateTaskPriority({
  deadline: han_chot,
  documentTypeName: documentTypeInfo?.document_type_name,
  documentTypeWeight: documentTypeInfo?.priority_weight,
});
    // 1. tạo task
    const taskRes = await client.query(
  `
  INSERT INTO tasks
  (
    unit_id,
    tieu_de,
    mo_ta,
    muc_do,
    han_chot,
    trang_thai_id,
    chu_ky_bao_cao,
    priority_score,
    priority_level,
    priority_reason
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  RETURNING *
  `,
  [
  data.unit_id,
  tieu_de,
  mo_ta,
  muc_do || null,
  han_chot,
  statusId,
  chu_ky_bao_cao || "mot_lan",
  priority.priority_score,
  priority.priority_level,
  priority.priority_reason,
]
);

    const task = taskRes.rows[0];
    // =======================
// LINK DOCUMENT TO TASK
// =======================
if (document_id) {
  await client.query(
    `
    INSERT INTO task_documents (
      task_id,
      document_id,
      relation_type
    )
    VALUES ($1, $2, $3)
    `,
    [
      task.id,
      document_id,
      "van_ban_giao_nhiem_vu",
    ]
  );

  await client.query(
    `
    UPDATE documents
    SET status = 'da_tao_nhiem_vu',
    workflow_status = 'task_created',
    updated_at = NOW()
    WHERE id = $1
    `,
    [document_id]
  );
}


// 🔔 notify assignee
// 🔔 notify trưởng phòng
const leaders = await client.query(
  `
  SELECT u.id
  FROM users u
  JOIN role_permissions rp
    ON rp.role_id = u.role_id
  WHERE u.unit_id = $1
  AND rp.permission = 'approve_level_1'
  `,
  [data.unit_id]
);

await Promise.all(
  leaders.rows.map(l =>
    createNotification({
      userId: l.id,
      type: "task_assigned_unit",
      title: "Có nhiệm vụ mới cần xác nhận",
      taskId: task.id,
    })
  )
);

    // 2. tạo conversation
  // 2. tạo conversation lãnh đạo ↔ đơn vị
const convoRes = await client.query(
  `
  INSERT INTO conversations
  (
    task_id,
    created_by,
    type,
    scope
  )
  VALUES ($1, $2, 'task', 'leader_unit')
  RETURNING *
  `,
  [task.id, user.userId]
);

    const conversation = convoRes.rows[0];

    // 3. add người tạo vào chat
    await client.query(
  `
  INSERT INTO conversation_members
  (
    conversation_id,
    user_id,
    is_active
  )
  VALUES ($1, $2, true)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET is_active = true
  `,
  [conversation.id, user.userId]
); 
    await createLog(
      task.id,
      user.userId,
      "Tạo nhiệm vụ"
    );
    await client.query("COMMIT");

emitTaskChanged("created", task.id, {
  unitId: task.unit_id,
  byUserId: user.userId || user.id,
});

if (document_id) {
  emitDocumentChanged("task_created", document_id, {
    taskId: task.id,
    unitId: task.unit_id,
    byUserId: user.userId || user.id,
  });
}

return {
  ...task,
  conversation_id: conversation.id
};

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};


// =======================
// UPDATE TASK PROGRESS
// =======================
exports.updateTaskProgress = async (taskId, userId, data) => {
  const { noi_dung, trang_thai_sau, kpi_sau } = data;

  const result = await pool.query(
    `INSERT INTO task_updates 
     (task_id, user_id, noi_dung, trang_thai_sau, kpi_sau)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [taskId, userId, noi_dung, trang_thai_sau, kpi_sau]
  );
  await createLog(
    taskId,
    userId,
    "Cập nhật tiến độ nhiệm vụ"
  );
  return result.rows[0];
};


// =======================
// SUBMIT TASK
// =======================
exports.submitTask = async (taskId, userId, noi_dung, file) => {

  // 🔥 kiểm tra task tồn tại
    const taskCheck = await pool.query(
  `
  SELECT
    t.*,
    tt.code AS status_code
  FROM tasks t
  JOIN trang_thai_task tt
    ON t.trang_thai_id = tt.id
  WHERE t.id = $1
  `,
  [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];
  const allowedSubmitStatuses = [
  "dang_thuc_hien",
  "yeu_cau_chinh_sua",
];

if (
  !allowedSubmitStatuses.includes(
    task.status_code
  )
) {
  throw new Error(
    "Task chưa ở trạng thái được phép nộp"
  );
}

  // =======================
  // LƯU SUBMISSION
  // =======================
  const submission = await pool.query(
  `
  INSERT INTO task_submissions 
  (
    task_id,
    submitted_by,
    noi_dung_tom_tat,
    file_name,
    file_path,
    file_type
  )
  VALUES ($1,$2,$3,$4,$5,$6)
  RETURNING *
  `,
  [
    taskId,
    userId,
    noi_dung,
    file
  ? safeFileName(decodeFileName(file.originalname))
  : null,
    file ? `/uploads/task-submissions/${file.filename}` : null,
    file ? file.mimetype : null,
  ]
);

  const unitId = task.unit_id;

  // =======================
  // TÌM TRƯỞNG BAN
  // =======================
  const leaders = await pool.query(
    `SELECT u.id 
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     WHERE u.unit_id = $1
     AND rp.permission = 'approve_level_1'`,
    [unitId]
  );

  if (leaders.rows.length === 0) {
    throw new Error("Không có trưởng ban để duyệt");
  }

  // =======================
  // UPDATE TRẠNG THÁI (FIX)
  // =======================

  // 🔥 lấy id của trạng thái mới
  const status = await pool.query(
    "SELECT id FROM trang_thai_task WHERE code = 'cho_duyet_cap_1'"
  );

  // 🔥 update bằng FK
  await pool.query(
    `UPDATE tasks 
    SET trang_thai_id = $1
    WHERE id=$2`,
    [status.rows[0].id, taskId]
  );

  // =======================
  // 🔔 THÔNG BÁO CHO TRƯỞNG BAN
  // =======================
  await Promise.all(
  leaders.rows.map((l) =>
    createNotification({
      userId: l.id,
      type: "task_submitted",
      title: "Có nhiệm vụ cần phê duyệt",
      taskId,
      content: `Nhiệm vụ: ${task.tieu_de}`,
    })
  )
);

  // =======================
  // 🔔 THÔNG BÁO CHO NGƯỜI SUBMIT
  // =======================
  await createNotification({
  userId,
  type: "task_submitted",
  title: "Bạn đã gửi nhiệm vụ lên cấp trên",
  taskId,
  content: `Nhiệm vụ: ${task.tieu_de}`,
});

  const logAction =
  task.status_code === "yeu_cau_chinh_sua"
    ? file
      ? "Đã nộp lại nhiệm vụ kèm file minh chứng"
      : "Đã nộp lại nhiệm vụ"
    : file
    ? "Đã nộp nhiệm vụ kèm file minh chứng"
    : "Đã nộp nhiệm vụ";

await createLog(
  taskId,
  userId,
  logAction
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "submitted",
  byUserId: userId,
});

return submission.rows[0];
};

// =======================
// APPROVE TASK
// =======================
exports.approveTask = async (
  taskId,
  approverId,
  decision,
  note,
  user
) => {
  // =======================
  // CHECK TASK
  // =======================
  const taskCheck = await pool.query(
    `
    SELECT
      t.*,
      tt.code AS status_code
    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    WHERE t.id = $1
      AND t.deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];
  const currentStatus = task.status_code;

  // =======================
  // CHECK PERMISSION FIRST
  // =======================
  const permissions = user.permissions || [];

  const canApproveLevel1 =
    permissions.includes("approve_level_1") &&
    currentStatus === "cho_duyet_cap_1";

  const canApproveLevel2 =
    permissions.includes("approve_level_2") &&
    currentStatus === "cho_duyet_cap_2";

  if (!canApproveLevel1 && !canApproveLevel2) {
    throw new Error(
      "Bạn không có quyền duyệt hoặc sai trạng thái"
    );
  }

  // =======================
  // SAVE APPROVAL
  // =======================
  const approval = await pool.query(
    `
    INSERT INTO task_approvals
    (
      task_id,
      approver_id,
      quyet_dinh,
      ghi_chu
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [
      taskId,
      approverId,
      decision,
      note,
    ]
  );

  // =======================
  // REJECT
  // =======================
  if (decision === "tu_choi") {
    const statusReject = await pool.query(
      `
      SELECT id
      FROM trang_thai_task
      WHERE code = 'yeu_cau_chinh_sua'
      `
    );

    if (statusReject.rows.length === 0) {
      throw new Error(
        "Thiếu trạng thái yeu_cau_chinh_sua"
      );
    }

    await pool.query(
      `
      UPDATE tasks
      SET trang_thai_id = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [
        statusReject.rows[0].id,
        taskId,
      ]
    );

    // Lãnh đạo cấp 2 từ chối -> báo trưởng phòng
    if (currentStatus === "cho_duyet_cap_2") {
      const unitLeaders = await pool.query(
        `
        SELECT u.id
        FROM users u

        JOIN role_permissions rp
          ON rp.role_id = u.role_id

        WHERE u.unit_id = $1
          AND rp.permission = 'approve_level_1'
        `,
        [task.unit_id]
      );

      await Promise.all(
        unitLeaders.rows.map((leader) =>
          createNotification({
            userId: leader.id,
            type: "task_rejected",
            title:
              "Lãnh đạo yêu cầu chỉnh sửa nhiệm vụ",
            taskId,
          })
        )
      );

      await createLog(
        taskId,
        approverId,
        "Lãnh đạo từ chối, trả nhiệm vụ về trưởng phòng"
      );
    } else if (task.assignee_user_id) {
      await createNotification({
        userId: task.assignee_user_id,
        type: "task_rejected",
        title: "Nhiệm vụ bị trả lại, cần chỉnh sửa",
        taskId,
      });

      await createLog(
        taskId,
        approverId,
        "Từ chối nhiệm vụ"
      );
    }
    emitTaskChanged("status_changed", taskId, {
  actionDetail: "rejected",
  byUserId: approverId,
});
    return approval.rows[0];
  }

  // =======================
  // APPROVE
  // =======================
  let newStatus;

  // CẤP 1: Trưởng phòng duyệt -> gửi lãnh đạo
  if (canApproveLevel1) {
    newStatus = "cho_duyet_cap_2";

    await createLog(
      taskId,
      approverId,
      "Đã duyệt cấp 1"
    );

    const leaders = await pool.query(
      `
      SELECT u.id
      FROM users u

      JOIN role_permissions rp
        ON rp.role_id = u.role_id

      WHERE rp.permission = 'approve_level_2'
      `
    );

    if (leaders.rows.length === 0) {
      throw new Error("Không có người duyệt cấp 2");
    }

    await Promise.all(
      leaders.rows.map((leader) =>
        createNotification({
          userId: leader.id,
          type: "task_approved_level1",
          title:
            "Có nhiệm vụ cần lãnh đạo phê duyệt",
          taskId,
          content: `Nhiệm vụ: ${task.tieu_de}`,
        })
      )
    );
  }

  // CẤP 2: Lãnh đạo duyệt -> hoàn thành
  else if (canApproveLevel2) {
    newStatus = "hoan_thanh";

    await createLog(
      taskId,
      approverId,
      "Đã duyệt hoàn thành nhiệm vụ"
    );

    if (task.assignee_user_id) {
      await createNotification({
        userId: task.assignee_user_id,
        type: "task_approved_level2",
        title: "Nhiệm vụ đã được phê duyệt",
        taskId,
        content: `Nhiệm vụ: ${task.tieu_de}`,
      });
    }

    const unitLeaders = await pool.query(
      `
      SELECT u.id
      FROM users u

      JOIN role_permissions rp
        ON rp.role_id = u.role_id

      WHERE u.unit_id = $1
        AND rp.permission = 'approve_level_1'
      `,
      [task.unit_id]
    );

    await Promise.all(
      unitLeaders.rows.map((leader) =>
        createNotification({
          userId: leader.id,
          type: "task_approved_level2",
          title:
            "Nhiệm vụ đã được lãnh đạo phê duyệt",
          taskId,
          content: `Nhiệm vụ: ${task.tieu_de}`,
        })
      )
    );
  }

  const status = await pool.query(
    `
    SELECT id
    FROM trang_thai_task
    WHERE code = $1
    `,
    [newStatus]
  );

  if (status.rows.length === 0) {
    throw new Error(`Thiếu trạng thái ${newStatus}`);
  }

  await pool.query(
  `
  UPDATE tasks
  SET trang_thai_id = $1,
      completed_at = CASE
        WHEN $3::text = 'hoan_thanh' THEN NOW()
        ELSE completed_at
      END,
      archived_at = CASE
        WHEN $3::text = 'hoan_thanh' THEN NOW()
        ELSE archived_at
      END,
      updated_at = NOW()
  WHERE id = $2
  `,
  [
    status.rows[0].id,
    taskId,
    newStatus,
  ]
);
  emitTaskChanged("status_changed", taskId, {
  actionDetail: "approved",
  newStatus,
  byUserId: approverId,
});
  return approval.rows[0];
};
// =======================
// ASSIGN UNIT (LÃNH ĐẠO GIAO PHÒNG)
// =======================

// =======================
// GET TASKS BY UNIT (CHO DASHBOARD)
// =======================
exports.getTasksByUnit = async (unit_id) => {
  const result = await pool.query(
    `
    SELECT 
      t.id,
      t.tieu_de,
      tt.code AS status_code,
      t.han_chot
    FROM tasks t
    JOIN trang_thai_task tt ON t.trang_thai_id = tt.id
    WHERE t.unit_id = $1
      AND t.deleted_at IS NULL
    ORDER BY t.han_chot ASC
    `,
    [unit_id]
  );

  return result.rows;
};
exports.confirmUnitTask =
async (taskId, user) => {
    if (
    !user.permissions.includes(
      "approve_level_1"
    )
  ) {
    throw new Error(
      "Không có quyền xác nhận"
    );
  }
  const taskCheck = await pool.query(
`
SELECT
  t.*,
  tt.code AS status_code
FROM tasks t
JOIN trang_thai_task tt
  ON t.trang_thai_id = tt.id
WHERE t.id = $1
`,
[taskId]
);

if (
  taskCheck.rows.length === 0
) {
  throw new Error(
    "Task không tồn tại"
  );
}

const task =
  taskCheck.rows[0];

if (
  task.status_code !==
  "cho_xac_nhan_don_vi"
) {

  throw new Error(
    "Task không đúng trạng thái"
  );

}

  const status = await pool.query(
    `
    SELECT id
    FROM trang_thai_task
    WHERE code =
    'da_giao_nhiem_vu'
    `
  );

  const result = await pool.query(
  `
  UPDATE tasks
  SET trang_thai_id = $1
  WHERE id = $2
  RETURNING *
  `,
  [
    status.rows[0].id,
    taskId
  ]
);

// =======================
// THÊM TRƯỞNG PHÒNG VÀO CHAT TASK
// =======================
const convo = await pool.query(
  `
  SELECT id
  FROM conversations
  WHERE task_id = $1
    AND type = 'task'
    AND scope = 'leader_unit'
  `,
  [taskId]
);

if (convo.rows.length > 0) {
  await pool.query(
  `
  INSERT INTO conversation_members
  (
    conversation_id,
    user_id,
    is_active
  )
  VALUES ($1, $2, true)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET is_active = true
  `,
  [
    convo.rows[0].id,
    user.userId
  ]
);;
}

if (task.nguoi_tao_id || task.created_by) {
  await createNotification({
    userId: task.nguoi_tao_id || task.created_by,
    type: "task_unit_confirmed",
    title: "Đơn vị đã xác nhận tiếp nhận nhiệm vụ",
    taskId,
    content: `Nhiệm vụ: ${task.tieu_de}`,
  });
}
await createLog(
  taskId,
  user.userId,
  "Trưởng phòng xác nhận nhận nhiệm vụ"
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "unit_confirmed",
  byUserId: user.userId || user.id,
});

return result.rows[0];
};
exports.confirmAssignedTask =
async (taskId, user) => {
  const task = await pool.query(
  `
  SELECT *
  FROM tasks
  WHERE id = $1
  `,
  [taskId]
  );

  const statusCheck = await pool.query(
`
SELECT
  tt.code AS status_code
FROM tasks t
JOIN trang_thai_task tt
  ON t.trang_thai_id = tt.id
WHERE t.id = $1
`,
[taskId]
);

if (
  statusCheck.rows[0]
    .status_code !==
  "cho_nhan_viec"
) {

  throw new Error(
    "Task chưa được giao"
  );

}

  if (
    task.rows[0]
      .assignee_user_id
    !== user.userId
  ) {
    throw new Error(
      "Không phải người thực hiện"
    );
  }

  const status = await pool.query(
    `
    SELECT id
    FROM trang_thai_task
    WHERE code =
    'dang_thuc_hien'
    `
  );

  const result = await pool.query(
    `
    UPDATE tasks
    SET trang_thai_id = $1
    WHERE id = $2
    RETURNING *
    `,
    [
      status.rows[0].id,
      taskId
    ]
  );

  // Thông báo cho trưởng phòng khi nhân viên xác nhận nhận việc
const reviewers = await pool.query(
  `
  SELECT u.id
  FROM users u
  JOIN role_permissions rp
    ON rp.role_id = u.role_id
  WHERE u.unit_id = $1
    AND rp.permission = 'approve_level_1'
  `,
  [task.rows[0].unit_id]
);

await Promise.all(
  reviewers.rows.map((r) =>
    createNotification({
      userId: r.id,
      type: "task_assignee_confirmed",
      title: "Nhân viên đã xác nhận nhận nhiệm vụ",
      taskId,
      content: `Nhiệm vụ: ${task.rows[0].tieu_de || "Không có tiêu đề"}`,
    })
  )
);

await createLog(
  taskId,
  user.userId,
  "Nhân viên bắt đầu thực hiện nhiệm vụ"
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "assigned_confirmed",
  byUserId: user.userId || user.id,
});

return result.rows[0];
};
// =======================
// CREATE MULTIPLE TASKS FROM DOCUMENT
// =======================
exports.createTasksFromDocument = async (
  data,
  user
) => {
  if (!user.permissions.includes("task:create")) {
    throw new Error("Không có quyền tạo nhiệm vụ");
  }

  if (!user.permissions.includes("document:create_task")) {
  throw new Error("Không có quyền tạo nhiệm vụ từ văn bản");
}
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { document_id, tasks } = data;

    if (!document_id) {
      throw new Error("Thiếu document_id");
    }

    if (
      !Array.isArray(tasks) ||
      tasks.length === 0
    ) {
      throw new Error("Danh sách nhiệm vụ rỗng");
    }

    // kiểm tra văn bản tồn tại
    const documentCheck = await client.query(
  `
  SELECT
    d.id,
    d.workflow_status,
    dt.name AS document_type_name,
    COALESCE(dt.priority_weight, 10) AS priority_weight
  FROM documents d
  LEFT JOIN document_types dt
    ON d.loai_van_ban_id = dt.id
  WHERE d.id = $1
    AND d.deleted_at IS NULL
  `,
  [document_id]
);

    if (documentCheck.rows.length === 0) {
      throw new Error("Văn bản không tồn tại");
    }

    const documentInfo = documentCheck.rows[0];

if (documentInfo.workflow_status !== "sent_to_leader") {
  throw new Error(
    "Văn bản chưa được trình lãnh đạo, không thể tạo nhiệm vụ"
  );
}

    // lấy trạng thái mặc định
    const statusResult = await client.query(
      `
      SELECT id
      FROM trang_thai_task
      WHERE code = 'cho_xac_nhan_don_vi'
      `
    );

    if (statusResult.rows.length === 0) {
      throw new Error(
        "Thiếu trạng thái cho_xac_nhan_don_vi"
      );
    }

    const statusId = statusResult.rows[0].id;

    const createdTasks = [];

    for (const item of tasks) {
      const {
        tieu_de,
        mo_ta,
        muc_do,
        han_chot,
        unit_id,
        assignee_user_id,
        chu_ky_bao_cao,
      } = item;

      if (!tieu_de || !han_chot) {
        throw new Error(
          "Mỗi nhiệm vụ cần có tiêu đề và hạn chót"
        );
      }

      let finalUnitId = unit_id;

      // trưởng phòng tạo thì tự lấy đơn vị của mình
      if (user.role === "truong_phong") {
        finalUnitId = user.unit_id;
      }

      // lãnh đạo bắt buộc chọn đơn vị
      if (
        user.role === "lanh_dao" &&
        !finalUnitId
      ) {
        throw new Error(
          "Có nhiệm vụ chưa chọn phòng ban"
        );
      }
      const priority = calculateTaskPriority({
  deadline: han_chot,
  documentTypeName: documentInfo?.document_type_name,
  documentTypeWeight: documentInfo?.priority_weight,
});

      const taskRes = await client.query(
  `
  INSERT INTO tasks
  (
    unit_id,
    assignee_user_id,
    tieu_de,
    mo_ta,
    muc_do,
    han_chot,
    trang_thai_id,
    chu_ky_bao_cao,
    priority_score,
    priority_level,
    priority_reason
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  RETURNING *
  `,
  [
  finalUnitId,
  assignee_user_id || null,
  tieu_de,
  mo_ta || "",
  muc_do || null,
  han_chot,
  statusId,
  chu_ky_bao_cao || "mot_lan",
  priority.priority_score,
  priority.priority_level,
  priority.priority_reason,
]
);

      const task = taskRes.rows[0];

      // liên kết văn bản với task
      await client.query(
        `
        INSERT INTO task_documents
        (
          task_id,
          document_id,
          relation_type
        )
        VALUES ($1,$2,$3)
        `,
        [
          task.id,
          document_id,
          "van_ban_giao_nhiem_vu",
        ]
      );

      // tạo conversation cho task
      const convoRes = await client.query(
        `
        INSERT INTO conversations
(task_id, created_by, type, scope)
VALUES ($1,$2,'task','leader_unit')
        RETURNING *
        `,
        [task.id, user.userId]
      );

      const conversation = convoRes.rows[0];

      await client.query(
        `
        INSERT INTO conversation_members
        (conversation_id, user_id)
        VALUES ($1,$2)
        `,
        [conversation.id, user.userId]
      );

      await createLog(
        task.id,
        user.userId,
        "Tạo nhiệm vụ từ văn bản"
      );

      // thông báo trưởng phòng đơn vị nhận task
      const leaders = await client.query(
        `
        SELECT u.id
        FROM users u
        JOIN role_permissions rp
          ON rp.role_id = u.role_id
        WHERE u.unit_id = $1
        AND rp.permission = 'approve_level_1'
        `,
        [finalUnitId]
      );

      await Promise.all(
        leaders.rows.map((l) =>
          createNotification({
            userId: l.id,
            type: "task_assigned_unit",
            title:
              "Có nhiệm vụ mới từ văn bản cần xác nhận",
            taskId: task.id,
          })
        )
      );

      createdTasks.push({
        ...task,
        conversation_id: conversation.id,
      });
    }

    // cập nhật trạng thái văn bản sau khi tạo nhiều task
    await client.query(
      `
      UPDATE documents
      SET status = 'da_tao_nhiem_vu',
      workflow_status = 'task_created',
      updated_at = NOW()
      WHERE id = $1
      `,
      [document_id]
    );

   await client.query("COMMIT");

createdTasks.forEach((task) => {
  emitTaskChanged("created", task.id, {
    unitId: task.unit_id,
    byUserId: user.userId || user.id,
  });
});

emitDocumentChanged("task_created", document_id, {
  taskIds: createdTasks.map((task) => task.id),
  byUserId: user.userId || user.id,
});

return createdTasks;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// =======================
// CREATE SUBTASK
// Trưởng phòng phân công nội bộ
// =======================
exports.createSubtask = async (data, user) => {
  const {
    task_id,
    tieu_de,
    mo_ta,
    assignee_user_id,
    han_chot,
  } = data;

  if (!task_id) {
    throw new Error("Thiếu task_id");
  }

  if (!tieu_de || !assignee_user_id || !han_chot) {
    throw new Error(
      "Thiếu tiêu đề, người thực hiện hoặc hạn chót"
    );
  }

  // Chỉ trưởng phòng / người có quyền duyệt cấp 1 mới phân công nội bộ
  // Chỉ người có quyền tạo phần việc nội bộ mới được phân công
if (!user.permissions.includes("subtask:create")) {
  throw new Error("Không có quyền phân công nội bộ");
}

  // Kiểm tra task chính
  const taskCheck = await pool.query(
    `
    SELECT
      t.*,
      tt.code AS status_code
    FROM tasks t
    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id
    WHERE t.id = $1
      AND t.deleted_at IS NULL
    `,
    [task_id]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];

// =======================
// CHECK HẠN PHẦN VIỆC KHÔNG VƯỢT HẠN TASK CHÍNH
// =======================
const taskDeadline = new Date(task.han_chot);
const subtaskDeadline = new Date(han_chot);

taskDeadline.setHours(0, 0, 0, 0);
subtaskDeadline.setHours(0, 0, 0, 0);

if (subtaskDeadline > taskDeadline) {
  throw new Error(
    "Hạn hoàn thành phần việc không được vượt quá hạn chót của nhiệm vụ chính"
  );
}

  // Trưởng phòng chỉ được phân công task thuộc phòng mình
  if (task.unit_id !== user.unit_id) {
    throw new Error(
      "Không thể phân công nhiệm vụ ngoài phòng ban"
    );
  }

  // Chỉ phân công sau khi đã tiếp nhận nhiệm vụ
  const allowedStatuses = [
    "da_giao_nhiem_vu",
    "cho_nhan_viec",
    "dang_thuc_hien",
    "yeu_cau_chinh_sua",
  ];

  if (!allowedStatuses.includes(task.status_code)) {
    throw new Error(
      "Chỉ được phân công sau khi đã tiếp nhận nhiệm vụ"
    );
  }

  // Kiểm tra nhân viên được giao thuộc cùng phòng
  const userCheck = await pool.query(
  `
  SELECT id, unit_id
  FROM users
  WHERE id = $1
  `,
  [assignee_user_id]
);

  if (userCheck.rows.length === 0) {
    throw new Error("Nhân viên không tồn tại");
  }

  if (userCheck.rows[0].unit_id !== task.unit_id) {
    throw new Error(
      "Không thể giao phần việc cho người khác phòng"
    );
  }

  // Tạo subtask
  const result = await pool.query(
    `
    INSERT INTO subtasks
    (
      task_id,
      tieu_de,
      mo_ta,
      assignee_user_id,
      han_chot,
      trang_thai,
      kpi_phan_tram,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      task_id,
      tieu_de,
      mo_ta || "",
      assignee_user_id,
      han_chot,
      "cho_nhan_viec",
      0,
      user.userId,
    ]
  );

  const subtask = result.rows[0];

  // Nếu task chính chưa có assignee thì gán người đầu tiên vào task chính để giữ tương thích UI cũ
  if (!task.assignee_user_id) {
    const status = await pool.query(
      `
      SELECT id
      FROM trang_thai_task
      WHERE code = 'cho_nhan_viec'
      `
    );

    await pool.query(
      `
      UPDATE tasks
      SET assignee_user_id = $1,
          trang_thai_id = $2,
          updated_at = NOW()
      WHERE id = $3
      `,
      [
        assignee_user_id,
        status.rows[0].id,
        task_id,
      ]
    );
  }

  // Tạo / lấy chat trưởng phòng - nhân viên
  let convo = await pool.query(
    `
    SELECT id
    FROM conversations
    WHERE task_id = $1
      AND type = 'task'
      AND scope = 'unit_employee'
    `,
    [task_id]
  );

  let conversationId;

  if (convo.rows.length === 0) {
    const newConvo = await pool.query(
      `
      INSERT INTO conversations
      (
        task_id,
        created_by,
        type,
        scope
      )
      VALUES ($1, $2, 'task', 'unit_employee')
      RETURNING id
      `,
      [task_id, user.userId]
    );

    conversationId = newConvo.rows[0].id;
  } else {
    conversationId = convo.rows[0].id;
  }

  // Thêm trưởng phòng vào chat
  await pool.query(
  `
  INSERT INTO conversation_members
  (
    conversation_id,
    user_id,
    is_active
  )
  VALUES ($1, $2, true)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET is_active = true
  `,
  [conversationId, user.userId]
);

  // Thêm nhân viên được giao vào chat
  await pool.query(
  `
  INSERT INTO conversation_members
  (
    conversation_id,
    user_id,
    is_active
  )
  VALUES ($1, $2, true)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET is_active = true
  `,
  [conversationId, assignee_user_id]
);

  // Thông báo cho nhân viên
  await createNotification({
    userId: assignee_user_id,
    type: "subtask_assigned",
    title: `Bạn được giao phần việc: ${tieu_de}`,
    taskId: task_id,
  });

  await createLog(
  task_id,
  user.userId,
  `Phân công nội bộ: ${tieu_de}`
);

emitTaskChanged("status_changed", task_id, {
  actionDetail: "subtask_created",
  subtaskId: subtask.id,
  byUserId: user.userId || user.id,
});

return subtask;
};
// =======================
// GET TASK SUBTASKS
// Lấy danh sách phần việc nội bộ của task
// =======================
exports.getTaskSubtasks = async (taskId, user) => {
  const currentUserId = Number(user.userId || user.id);
  const currentUnitId = Number(user.unit_id);
  const currentRoleId = Number(user.roleId || user.role_id);
  const permissions = user.permissions || [];

  // =======================
  // CHECK TASK CHÍNH
  // =======================
  const taskCheck = await pool.query(
    `
    SELECT *
    FROM tasks
    WHERE id = $1
      AND deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];
  const taskUnitId = Number(task.unit_id);

  // =======================
  // CHECK QUYỀN XEM
  // =======================

  // Admin / lãnh đạo xem tất cả
  if (permissions.includes("task:view_all")) {
    // được xem
  }

  // Trưởng phòng xem task thuộc phòng mình
  else if (
    permissions.includes("task:view_unit") &&
    taskUnitId === currentUnitId
  ) {
    // được xem
  }

  // Nhân viên: xem nếu có subtask của mình
  else {
    const ownCheck = await pool.query(
      `
      SELECT id
      FROM subtasks
      WHERE task_id = $1
        AND assignee_user_id = $2
      LIMIT 1
      `,
      [taskId, currentUserId]
    );

    if (ownCheck.rows.length === 0) {
      throw new Error("Không có quyền xem phần việc này");
    }
  }

  // =======================
  // QUERY SUBTASKS
  // =======================
  let query = `
    SELECT
      s.*,
      u.full_name AS assignee_name,
      u.username AS assignee_username
    FROM subtasks s
    LEFT JOIN users u
      ON s.assignee_user_id = u.id
    WHERE s.task_id = $1
  `;

  const values = [taskId];

  // Nhân viên chỉ thấy phần việc của mình
  if (
    user.role === "nhan_vien" ||
    currentRoleId === 4
  ) {
    values.push(currentUserId);

    query += `
      AND s.assignee_user_id = $${values.length}
    `;
  }

  query += `
    ORDER BY s.created_at DESC
  `;

  const result = await pool.query(query, values);

  return result.rows;
};
// =======================
// UPDATE SUBTASK
// Trưởng phòng sửa phần việc nội bộ
// =======================
exports.updateSubtask = async (
  taskId,
  subtaskId,
  data,
  user
) => {
  const {
    tieu_de,
    mo_ta,
    assignee_user_id,
    han_chot,
  } = data;

  if (!user.permissions.includes("subtask:create")) {
    throw new Error("Không có quyền sửa phần việc");
  }

  if (!tieu_de || !assignee_user_id || !han_chot) {
    throw new Error(
      "Thiếu tiêu đề, người thực hiện hoặc hạn hoàn thành"
    );
  }

  const taskCheck = await pool.query(
    `
    SELECT *
    FROM tasks
    WHERE id = $1
      AND deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];

  if (task.unit_id !== user.unit_id) {
    throw new Error(
      "Không được sửa phần việc ngoài phòng ban"
    );
  }

  const subtaskCheck = await pool.query(
    `
    SELECT *
    FROM subtasks
    WHERE id = $1
      AND task_id = $2
    `,
    [subtaskId, taskId]
  );

  if (subtaskCheck.rows.length === 0) {
    throw new Error("Phần việc không tồn tại");
  }

  const subtask = subtaskCheck.rows[0];

  if (subtask.trang_thai === "hoan_thanh") {
    throw new Error(
      "Phần việc đã hoàn thành, không thể sửa"
    );
  }

  const taskDeadline = new Date(task.han_chot);
  const subtaskDeadline = new Date(han_chot);

  taskDeadline.setHours(0, 0, 0, 0);
  subtaskDeadline.setHours(0, 0, 0, 0);

  if (subtaskDeadline > taskDeadline) {
    throw new Error(
      "Hạn hoàn thành phần việc không được vượt quá hạn chót nhiệm vụ chính"
    );
  }

  const userCheck = await pool.query(
    `
    SELECT id, unit_id
    FROM users
    WHERE id = $1
    `,
    [assignee_user_id]
  );

  if (userCheck.rows.length === 0) {
    throw new Error("Nhân viên không tồn tại");
  }

  if (userCheck.rows[0].unit_id !== task.unit_id) {
    throw new Error(
      "Không thể giao phần việc cho người khác phòng"
    );
  }

  const result = await pool.query(
    `
    UPDATE subtasks
    SET tieu_de = $1,
        mo_ta = $2,
        assignee_user_id = $3,
        han_chot = $4,
        updated_at = NOW()
    WHERE id = $5
      AND task_id = $6
    RETURNING *
    `,
    [
      tieu_de,
      mo_ta || "",
      assignee_user_id,
      han_chot,
      subtaskId,
      taskId,
    ]
  );

  await createLog(
  taskId,
  user.userId,
  `Cập nhật phần việc nội bộ: ${tieu_de}`
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "subtask_updated",
  subtaskId,
  byUserId: user.userId || user.id,
});

return result.rows[0];
};
// =======================
// START SUBTASK
// Nhân viên bắt đầu thực hiện phần việc
// =======================
exports.startSubtask = async (
  taskId,
  subtaskId,
  user
) => {
  if (!user.permissions.includes("task:submit")) {
  throw new Error("Không có quyền thực hiện phần việc");
}
  const currentUserId = Number(user.userId || user.id);

  // =======================
  // CHECK TASK
  // =======================
  const taskCheck = await pool.query(
    `
    SELECT *
    FROM tasks
    WHERE id = $1
      AND deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  // =======================
  // CHECK SUBTASK
  // =======================
  const subtaskCheck = await pool.query(
    `
    SELECT *
    FROM subtasks
    WHERE id = $1
      AND task_id = $2
    `,
    [subtaskId, taskId]
  );

  if (subtaskCheck.rows.length === 0) {
    throw new Error("Phần việc không tồn tại");
  }

  const subtask = subtaskCheck.rows[0];

  if (Number(subtask.assignee_user_id) !== currentUserId) {
    throw new Error(
      "Bạn không phải người được giao phần việc này"
    );
  }

  if (subtask.trang_thai !== "cho_nhan_viec") {
    throw new Error(
      "Phần việc không ở trạng thái chờ nhận"
    );
  }

  // =======================
  // UPDATE SUBTASK STATUS
  // =======================
  const result = await pool.query(
    `
    UPDATE subtasks
    SET trang_thai = 'dang_thuc_hien',
        updated_at = NOW()
    WHERE id = $1
      AND task_id = $2
    RETURNING *
    `,
    [subtaskId, taskId]
  );

  // Nếu task chính chưa ở đang thực hiện thì cập nhật sang đang thực hiện
  const status = await pool.query(
    `
    SELECT id
    FROM trang_thai_task
    WHERE code = 'dang_thuc_hien'
    `
  );

  if (status.rows.length > 0) {
    await pool.query(
      `
      UPDATE tasks
      SET trang_thai_id = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [status.rows[0].id, taskId]
    );
  }

  // Thông báo cho trưởng phòng khi nhân viên bắt đầu phần việc
const reviewers = await pool.query(
  `
  SELECT u.id
  FROM users u
  JOIN role_permissions rp
    ON rp.role_id = u.role_id
  WHERE u.unit_id = $1
    AND rp.permission = 'approve_level_1'
  `,
  [taskCheck.rows[0].unit_id]
);

await Promise.all(
  reviewers.rows.map((r) =>
    createNotification({
      userId: r.id,
      type: "subtask_started",
      title: `Nhân viên đã bắt đầu phần việc: ${subtask.tieu_de}`,
      taskId,
      content: `Phần việc: ${subtask.tieu_de}`,
    })
  )
);

await createLog(
  taskId,
  currentUserId,
  `Bắt đầu thực hiện phần việc: ${subtask.tieu_de}`
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "subtask_started",
  subtaskId,
  byUserId: currentUserId,
});

return result.rows[0];
};
// =======================
// UPDATE SUBTASK PROGRESS
// Nhân viên cập nhật tiến độ phần việc
// =======================
exports.updateSubtaskProgress = async (
  taskId,
  subtaskId,
  data,
  user
) => {
  if (!user.permissions.includes("task:submit")) {
  throw new Error("Không có quyền thực hiện phần việc");
}
  const currentUserId = user.userId || user.id;
  const { kpi_phan_tram } = data;

  if (
    kpi_phan_tram === undefined ||
    kpi_phan_tram === null
  ) {
    throw new Error("Thiếu tiến độ phần việc");
  }

  const progress = Number(kpi_phan_tram);

  if (Number.isNaN(progress) || progress < 0 || progress > 100) {
    throw new Error("Tiến độ phải nằm trong khoảng 0 đến 100");
  }

  const subtaskCheck = await pool.query(
    `
    SELECT *
    FROM subtasks
    WHERE id = $1
      AND task_id = $2
    `,
    [subtaskId, taskId]
  );

  if (subtaskCheck.rows.length === 0) {
    throw new Error("Phần việc không tồn tại");
  }

  const subtask = subtaskCheck.rows[0];

  if (subtask.assignee_user_id !== currentUserId) {
    throw new Error(
      "Bạn không phải người được giao phần việc này"
    );
  }

  if (subtask.trang_thai !== "dang_thuc_hien") {
    throw new Error(
      "Chỉ cập nhật tiến độ khi phần việc đang thực hiện"
    );
  }

  const result = await pool.query(
    `
    UPDATE subtasks
    SET kpi_phan_tram = $1,
        updated_at = NOW()
    WHERE id = $2
      AND task_id = $3
    RETURNING *
    `,
    [progress, subtaskId, taskId]
  );

  await createLog(
  taskId,
  currentUserId,
  `Cập nhật tiến độ phần việc "${subtask.tieu_de}" lên ${progress}%`
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "subtask_progress_updated",
  subtaskId,
  progress,
  byUserId: currentUserId,
});

return result.rows[0];
};
// =======================
// SUBMIT SUBTASK
// Nhân viên nộp phần việc con
// =======================
exports.submitSubtask = async (
  taskId,
  subtaskId,
  data,
  user
) => {
  if (!user.permissions.includes("task:submit")) {
    throw new Error("Không có quyền thực hiện phần việc");
  }
  const currentUserId = user.userId || user.id;
  const { noi_dung_nop, file } = data;

  if (!noi_dung_nop || !noi_dung_nop.trim()) {
    throw new Error("Vui lòng nhập nội dung nộp");
  }

  // =======================
  // CHECK TASK
  // =======================
  const taskCheck = await pool.query(
    `
    SELECT *
    FROM tasks
    WHERE id = $1
      AND deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  // =======================
  // CHECK SUBTASK
  // =======================
  const subtaskCheck = await pool.query(
    `
    SELECT *
    FROM subtasks
    WHERE id = $1
      AND task_id = $2
    `,
    [subtaskId, taskId]
  );

  if (subtaskCheck.rows.length === 0) {
    throw new Error("Phần việc không tồn tại");
  }

  const subtask = subtaskCheck.rows[0];

  if (subtask.assignee_user_id !== currentUserId) {
    throw new Error(
      "Bạn không phải người được giao phần việc này"
    );
  }

  const allowedStatuses = [
    "dang_thuc_hien",
    "yeu_cau_chinh_sua",
  ];

  if (!allowedStatuses.includes(subtask.trang_thai)) {
    throw new Error(
      "Chỉ có thể nộp phần việc khi đang thực hiện hoặc được yêu cầu chỉnh sửa"
    );
  }

  const fileName = file
    ? safeFileName(decodeFileName(file.originalname))
    : null;

  const filePath = file
    ? `/uploads/task-submissions/${file.filename}`
    : null;

  const fileType = file ? file.mimetype : null;

  // =======================
  // UPDATE SUBTASK
  // =======================
  const result = await pool.query(
    `
    UPDATE subtasks
    SET noi_dung_nop = $1,
        file_name = $2,
        file_path = $3,
        file_type = $4,
        submitted_at = NOW(),
        trang_thai = 'cho_duyet',
        updated_at = NOW()
    WHERE id = $5
      AND task_id = $6
    RETURNING *
    `,
    [
      noi_dung_nop,
      fileName,
      filePath,
      fileType,
      subtaskId,
      taskId,
    ]
  );
  // =======================
// THÔNG BÁO CHO TRƯỞNG PHÒNG KHI NHÂN VIÊN NỘP PHẦN VIỆC
// =======================
const reviewers = await pool.query(
  `
  SELECT u.id
  FROM users u
  JOIN role_permissions rp
    ON rp.role_id = u.role_id
  WHERE u.unit_id = $1
    AND rp.permission = 'approve_level_1'
  `,
  [taskCheck.rows[0].unit_id]
);

await Promise.all(
  reviewers.rows.map((r) =>
    createNotification({
      userId: r.id,
      type: "subtask_submitted",
      title: `Nhân viên đã nộp phần việc: ${subtask.tieu_de}`,
      taskId,
      content: noi_dung_nop,
    })
  )
);
  await createLog(
  taskId,
  currentUserId,
  `Nộp phần việc: ${subtask.tieu_de}`
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "subtask_submitted",
  subtaskId,
  byUserId: currentUserId,
});

return result.rows[0];
};
// =======================
// APPROVE SUBTASK
// Trưởng phòng duyệt / trả lại phần việc nội bộ
// =======================
exports.approveSubtask = async (
  taskId,
  subtaskId,
  decision,
  user
) => {
  const currentUserId = user.userId || user.id;

  // Chỉ trưởng phòng / người có quyền duyệt cấp 1
  if (!user.permissions.includes("approve_level_1")) {
    throw new Error("Không có quyền duyệt phần việc");
  }

  // Kiểm tra task
  const taskCheck = await pool.query(
    `
    SELECT *
    FROM tasks
    WHERE id = $1
      AND deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];

  // Trưởng phòng chỉ được duyệt task thuộc phòng mình
  if (task.unit_id !== user.unit_id) {
    throw new Error(
      "Không được duyệt phần việc ngoài phòng ban"
    );
  }

  // Kiểm tra subtask
  const subtaskCheck = await pool.query(
    `
    SELECT *
    FROM subtasks
    WHERE id = $1
      AND task_id = $2
    `,
    [subtaskId, taskId]
  );

  if (subtaskCheck.rows.length === 0) {
    throw new Error("Phần việc không tồn tại");
  }

  const subtask = subtaskCheck.rows[0];

  if (subtask.trang_thai !== "cho_duyet") {
    throw new Error(
      "Phần việc chưa ở trạng thái chờ duyệt"
    );
  }

  let newStatus;
  let logAction;
  let notificationTitle;

  if (decision === "chap_thuan") {
    newStatus = "hoan_thanh";
    logAction = `Duyệt hoàn thành phần việc: ${subtask.tieu_de}`;
    notificationTitle = `Phần việc đã được duyệt: ${subtask.tieu_de}`;
  } else if (decision === "tu_choi") {
    newStatus = "yeu_cau_chinh_sua";
    logAction = `Yêu cầu chỉnh sửa phần việc: ${subtask.tieu_de}`;
    notificationTitle = `Phần việc cần chỉnh sửa: ${subtask.tieu_de}`;
  } else {
    throw new Error("Quyết định không hợp lệ");
  }

  const isCompleted = newStatus === "hoan_thanh";

const result = await pool.query(
  `
  UPDATE subtasks
  SET trang_thai = $1::varchar,
      completed_at = CASE
        WHEN $2::boolean THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE id = $3::int
    AND task_id = $4::int
  RETURNING *
  `,
  [newStatus, isCompleted, subtaskId, taskId]
);

  // Thông báo cho nhân viên được giao subtask
  if (subtask.assignee_user_id) {
    await createNotification({
      userId: subtask.assignee_user_id,
      type:
        decision === "chap_thuan"
          ? "subtask_approved"
          : "subtask_rejected",
      title: notificationTitle,
      taskId,
    });
  }

  await createLog(
  taskId,
  currentUserId,
  logAction
);

emitTaskChanged("status_changed", taskId, {
  actionDetail:
    decision === "chap_thuan"
      ? "subtask_approved"
      : "subtask_rejected",
  subtaskId,
  byUserId: currentUserId,
});

return result.rows[0];
};
// =======================
// SEND TASK TO LEADER APPROVAL
// Trưởng phòng gửi nhiệm vụ lên lãnh đạo duyệt
// =======================
exports.sendTaskToLeaderApproval = async (taskId, user) => {
  const currentUserId = user.userId || user.id;

  // Chỉ trưởng phòng / người có quyền duyệt cấp 1
  if (!user.permissions.includes("approve_level_1")) {
    throw new Error("Không có quyền gửi lãnh đạo duyệt");
  }

  // Kiểm tra task
  const taskCheck = await pool.query(
    `
    SELECT
      t.*,
      tt.code AS status_code
    FROM tasks t
    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id
    WHERE t.id = $1
      AND t.deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];

  // Trưởng phòng chỉ được gửi task thuộc phòng mình
  if (task.unit_id !== user.unit_id) {
    throw new Error("Không thể gửi duyệt nhiệm vụ ngoài phòng ban");
  }

  // Không gửi nếu task đã hoàn thành
  if (task.status_code === "hoan_thanh") {
    throw new Error("Nhiệm vụ đã hoàn thành");
  }

  // Không gửi lại nếu đang chờ lãnh đạo duyệt
  if (task.status_code === "cho_duyet_cap_2") {
    throw new Error("Nhiệm vụ đang chờ lãnh đạo duyệt");
  }

  // Kiểm tra có phần việc chưa
  const subtaskStats = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE trang_thai = 'hoan_thanh'
      )::int AS completed
    FROM subtasks
    WHERE task_id = $1
    `,
    [taskId]
  );

  const total = subtaskStats.rows[0].total;
  const completed = subtaskStats.rows[0].completed;

  if (total === 0) {
    throw new Error("Chưa có phần việc nội bộ để gửi duyệt");
  }

  if (total !== completed) {
    throw new Error(
      "Chỉ được gửi lãnh đạo duyệt khi tất cả phần việc đã hoàn thành"
    );
  }

  // Lấy trạng thái cho_duyet_cap_2
  const status = await pool.query(
    `
    SELECT id
    FROM trang_thai_task
    WHERE code = 'cho_duyet_cap_2'
    `
  );

  if (status.rows.length === 0) {
    throw new Error("Thiếu trạng thái cho_duyet_cap_2");
  }

  const result = await pool.query(
    `
    UPDATE tasks
    SET trang_thai_id = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [status.rows[0].id, taskId]
  );

  // Thông báo cho lãnh đạo cấp 2
  const leaders = await pool.query(
    `
    SELECT u.id
    FROM users u
    JOIN role_permissions rp
      ON rp.role_id = u.role_id
    WHERE rp.permission = 'approve_level_2'
    `
  );

  await Promise.all(
    leaders.rows.map((leader) =>
      createNotification({
        userId: leader.id,
        type: "task_submitted",
        title: `Có nhiệm vụ cần lãnh đạo duyệt: ${task.tieu_de}`,
        taskId,
      })
    )
  );

  await createLog(
  taskId,
  currentUserId,
  "Gửi nhiệm vụ lên lãnh đạo duyệt"
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "sent_to_leader",
  byUserId: currentUserId,
});

return result.rows[0];
};
exports.requestSubtaskRevision = async (
  taskId,
  subtaskId,
  user
) => {
  const currentUserId = user.userId || user.id;

  if (!user.permissions.includes("approve_level_1")) {
    throw new Error("Không có quyền yêu cầu sửa phần việc");
  }

  const taskCheck = await pool.query(
    `
    SELECT
      t.*,
      tt.code AS status_code
    FROM tasks t
    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id
    WHERE t.id = $1
      AND t.deleted_at IS NULL
    `,
    [taskId]
  );

  if (taskCheck.rows.length === 0) {
    throw new Error("Task không tồn tại");
  }

  const task = taskCheck.rows[0];

  if (task.unit_id !== user.unit_id) {
    throw new Error("Không được yêu cầu sửa phần việc ngoài phòng ban");
  }

  if (task.status_code !== "yeu_cau_chinh_sua") {
    throw new Error("Chỉ yêu cầu sửa phần việc khi nhiệm vụ bị trả về");
  }

  const subtaskCheck = await pool.query(
    `
    SELECT *
    FROM subtasks
    WHERE id = $1
      AND task_id = $2
    `,
    [subtaskId, taskId]
  );

  if (subtaskCheck.rows.length === 0) {
    throw new Error("Phần việc không tồn tại");
  }

  const subtask = subtaskCheck.rows[0];

  if (subtask.trang_thai !== "hoan_thanh") {
    throw new Error("Chỉ có thể yêu cầu sửa phần việc đã hoàn thành");
  }

  const result = await pool.query(
  `
  UPDATE subtasks
  SET trang_thai = 'yeu_cau_chinh_sua',
      completed_at = NULL,
      updated_at = NOW()
  WHERE id = $1
    AND task_id = $2
  RETURNING *
  `,
  [subtaskId, taskId]
);

  if (subtask.assignee_user_id) {
    await createNotification({
      userId: subtask.assignee_user_id,
      type: "subtask_rejected",
      title: `Trưởng phòng yêu cầu sửa lại phần việc: ${subtask.tieu_de}`,
      taskId,
    });
  }

  await createLog(
  taskId,
  currentUserId,
  `Yêu cầu nhân viên sửa lại phần việc: ${subtask.tieu_de}`
);

emitTaskChanged("status_changed", taskId, {
  actionDetail: "subtask_revision_requested",
  subtaskId,
  byUserId: currentUserId,
});

return result.rows[0];
};