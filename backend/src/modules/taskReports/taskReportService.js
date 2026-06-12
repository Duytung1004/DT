const pool = require("../../config/db");
const { createNotification } = require("../../utils/notificationHelper");
const { createLog } = require("../../services/taskLogService");
const { getIO } = require("../../config/socket");
const ExcelJS = require("exceljs");
const {
  decodeFileName,
  safeFileName,
} = require("../../utils/fileNameHelper");

const emitReportChanged = (action, reportId, extra = {}) => {
  try {
    getIO().emit("report:changed", {
      action,
      reportId,
      ...extra,
    });
  } catch (err) {
    console.log("EMIT REPORT REALTIME ERROR:", err.message);
  }
};

const getSubtaskProgress = (status) => {
  switch (status) {
    case "cho_nhan_viec":
      return 0;
    case "dang_thuc_hien":
      return 50;
    case "cho_duyet":
      return 80;
    case "yeu_cau_chinh_sua":
      return 60;
    case "hoan_thanh":
      return 100;
    default:
      return 0;
  }
};

const pad2 = (value) => String(value).padStart(2, "0");

// =======================
// CURRENT MONTHLY PERIOD
// Thực tế Đảng ủy phường Tam Thanh:
// Báo cáo định kỳ 1 tháng / lần
// =======================
const getCurrentPeriod = (periodKey) => {
  let year;
  let monthIndex;

  if (periodKey && /^\d{4}-\d{2}$/.test(periodKey)) {
    const parts = periodKey.split("-").map(Number);

    year = parts[0];
    monthIndex = parts[1] - 1;
  } else {
    const now = new Date();

    year = now.getFullYear();
    monthIndex = now.getMonth();
  }

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const reportOpenAt = new Date(year, monthIndex, 1, 0, 0, 0, 0);

  return {
    chu_ky_bao_cao: "hang_thang",
    period_key: `${year}-${pad2(monthIndex + 1)}`,
    period_start: start,
    period_end: end,
    report_open_at: reportOpenAt,
    due_at: end,
  };
};

const getTaskProgress = async (taskId) => {
  const result = await pool.query(
    `
    SELECT trang_thai
    FROM subtasks
    WHERE task_id = $1
    `,
    [taskId]
  );

  if (result.rows.length === 0) {
    return 0;
  }

  const total = result.rows.reduce(
    (sum, item) =>
      sum + getSubtaskProgress(item.trang_thai),
    0
  );

  return Math.round(total / result.rows.length);
};

// =======================
// NORMALIZE FORM DATA
// Dùng để đọc task_ids và item_notes khi gửi FormData
// =======================
const normalizeArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(Number).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter(Boolean);
    }
  } catch (err) {
    // ignore
  }

  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter(Boolean);
};

const normalizeObject = (value) => {
  if (!value) return {};

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    return {};
  }
};

// =======================
// CREATE TASK PERIODIC REPORT
// Trưởng phòng báo cáo tiến độ nhiệm vụ cho lãnh đạo
// =======================
exports.createTaskReport = async (taskId, data, file, user) => {
  const currentUserId = user.userId || user.id;

  if (!user.permissions.includes("approve_level_1")) {
    throw new Error("Không có quyền gửi báo cáo nhiệm vụ");
  }

  const {
    noi_dung,
    kho_khan,
    de_xuat,
  } = data;

  if (!noi_dung || !noi_dung.trim()) {
    throw new Error("Vui lòng nhập nội dung báo cáo");
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
    throw new Error("Nhiệm vụ không tồn tại");
  }

  const task = taskCheck.rows[0];

  if (Number(task.unit_id) !== Number(user.unit_id)) {
    throw new Error("Không thể báo cáo nhiệm vụ ngoài phòng ban");
  }

  const period = getCurrentPeriod();

  const exists = await pool.query(
    `
    SELECT id
    FROM task_periodic_reports
    WHERE task_id = $1
      AND reporter_id = $2
      AND period_key = $3
    LIMIT 1
    `,
    [
      taskId,
      currentUserId,
      period.period_key,
    ]
  );

  if (exists.rows.length > 0) {
    throw new Error("Bạn đã gửi báo cáo nhiệm vụ này trong tháng này");
  }

  const progress = await getTaskProgress(taskId);

  const fileName = file
    ? safeFileName(decodeFileName(file.originalname))
    : null;

  const filePath = file
  ? `/uploads/task-reports/${file.filename}`
  : null;

  const fileType = file ? file.mimetype : null;

  const result = await pool.query(
    `
    INSERT INTO task_periodic_reports
    (
      task_id,
      unit_id,
      reporter_id,
      report_type,
      noi_dung,
      kho_khan,
      de_xuat,
      ti_le_hoan_thanh,
      status_snapshot,
      period_key,
      ky_bao_cao_tu,
      ky_bao_cao_den,
      han_bao_cao,
      report_status,
      file_name,
      file_path,
      file_type
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *
    `,
    [
    taskId,
    task.unit_id,
    currentUserId,
    "unit_to_leader",
    noi_dung,
    kho_khan || null,
    de_xuat || null,
    progress,
    task.status_code,
    period.period_key,
    period.period_start,
    period.period_end,
    period.due_at,
    "submitted",
    fileName,
    filePath,
    fileType,
  ]
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

  await Promise.all(
    leaders.rows.map((leader) =>
      createNotification({
        userId: leader.id,
        type: "report_task_periodic",
        title: `Có báo cáo định kỳ mới: ${task.tieu_de}`,
        taskId,
      })
    )
  );

  const report = result.rows[0];

emitReportChanged("created", report.id, {
  reportType: "task_report",
  periodKey: period.period_key,
  taskId,
  unitId: task.unit_id,
  reporterId: currentUserId,
});

return report;
};

// =======================
// GET TASK PERIODIC REPORTS
// Lấy báo cáo tiến độ nhiệm vụ
// =======================
exports.getTaskReports = async (taskId, user) => {
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
    throw new Error("Nhiệm vụ không tồn tại");
  }

  const task = taskCheck.rows[0];

  if (
    !user.permissions.includes("task:view_all") &&
    !(
      user.permissions.includes("task:view_unit") &&
      task.unit_id === user.unit_id
    )
  ) {
    throw new Error("Không có quyền xem báo cáo nhiệm vụ");
  }

  const result = await pool.query(
    `
    SELECT
      r.*,
      u.full_name AS reporter_name,
      u.username AS reporter_username
    FROM task_periodic_reports r
    LEFT JOIN users u
      ON r.reporter_id = u.id
    WHERE r.task_id = $1
    ORDER BY r.created_at DESC
    `,
    [taskId]
  );

  return result.rows;
};


// =======================
// GET ALL REPORTS FOR REPORTS PAGE
// Trang Báo cáo tổng hợp theo vai trò
// =======================
exports.getAllReports = async (user, filters = {}) => {
  const currentUserId = user.userId || user.id;

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(filters.limit) || 10, 1),
    100
  );
  const offset = (page - 1) * limit;

  let taskReportQuery = `
    SELECT
      r.id,
      'task_report' AS report_source,

      r.task_id,
      NULL::int AS subtask_id,

      COALESCE(t.tieu_de, 'Báo cáo tháng của phòng ban') AS task_title,
      NULL::text AS subtask_title,

      u_reporter.full_name AS reporter_name,
      u_reporter.username AS reporter_username,

      un.name AS unit_name,
      COALESCE(r.unit_id, t.unit_id) AS unit_id,

      'hang_thang' AS chu_ky_bao_cao,

      r.period_key,
      r.noi_dung,
      r.kho_khan,
      r.de_xuat,
      r.ti_le_hoan_thanh,

      r.ky_bao_cao_tu AS period_start,
      r.ky_bao_cao_den AS period_end,
      r.han_bao_cao,

      r.file_name,
      r.file_path,
      r.file_type,

      r.created_at

    FROM task_periodic_reports r

    LEFT JOIN tasks t
      ON r.task_id = t.id

    LEFT JOIN users u_reporter
      ON r.reporter_id = u_reporter.id

    LEFT JOIN units un
      ON un.id = COALESCE(r.unit_id, t.unit_id)

    WHERE r.report_type IN ('unit_to_leader', 'unit_monthly')
  `;

  let employeeReportQuery = `
    SELECT
      r.id,
      'employee_report' AS report_source,

      NULL::int AS task_id,
      NULL::int AS subtask_id,

      NULL::text AS task_title,
      NULL::text AS subtask_title,

      u_reporter.full_name AS reporter_name,
      u_reporter.username AS reporter_username,

      un.name AS unit_name,
      r.unit_id,

      'hang_thang' AS chu_ky_bao_cao,

      r.period_key,
      r.noi_dung,
      r.kho_khan,
      r.de_xuat,
      r.ti_le_hoan_thanh,

      r.period_start,
      r.period_end,
      r.han_bao_cao,

      r.file_name,
      r.file_path,
      r.file_type,

      r.created_at

    FROM employee_periodic_reports r

    LEFT JOIN users u_reporter
      ON r.reporter_id = u_reporter.id

    LEFT JOIN units un
      ON r.unit_id = un.id

    WHERE 1 = 1
  `;

  const values = [];

  if (filters.period_key) {
    values.push(filters.period_key);

    taskReportQuery += `
      AND r.period_key = $${values.length}
    `;

    employeeReportQuery += `
      AND r.period_key = $${values.length}
    `;
  }

  if (user.permissions.includes("task:view_all")) {
    // Lãnh đạo/admin xem tất cả
  } else if (
    user.permissions.includes("task:view_unit") &&
    user.unit_id
  ) {
    values.push(user.unit_id);

    taskReportQuery += `
      AND COALESCE(r.unit_id, t.unit_id) = $${values.length}
    `;

    employeeReportQuery += `
      AND r.unit_id = $${values.length}
    `;
  } else {
    values.push(currentUserId);

    taskReportQuery += `
      AND 1 = 0
    `;

    employeeReportQuery += `
      AND r.reporter_id = $${values.length}
    `;
  }

  const baseQuery = `
    ${taskReportQuery}

    UNION ALL

    ${employeeReportQuery}
  `;

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM (
      ${baseQuery}
    ) reports
    `,
    values
  );

  const total = countResult.rows[0]?.total || 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const dataValues = [...values, limit, offset];

  const dataResult = await pool.query(
    `
    SELECT *
    FROM (
      ${baseQuery}
    ) reports
    ORDER BY created_at DESC
    LIMIT $${dataValues.length - 1}
    OFFSET $${dataValues.length}
    `,
    dataValues
  );

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};
// =======================
// GET DUE REPORTS
// Nhắc báo cáo nhiệm vụ theo tháng
// =======================
exports.getDueReports = async (user, filters = {}) => {
  const period = getCurrentPeriod(filters.period_key);
  const currentPeriodKey = period.period_key;

  const shouldReportCondition = `
    tt.code <> 'hoan_thanh'
  `;

  // =======================
  // LÃNH ĐẠO / ADMIN
  // Xem phòng ban nào chưa gửi báo cáo tháng
  // =======================
  if (user.permissions.includes("task:view_all")) {
    const result = await pool.query(
      `
      SELECT
        'task_report_due' AS type,
        t.id AS task_id,
        NULL::int AS subtask_id,
        t.tieu_de AS task_title,
        NULL::text AS subtask_title,
        un.name AS unit_name,
        'hang_thang' AS chu_ky_bao_cao,
        t.han_chot,
        NULL::text AS reporter_name,

        CASE
          WHEN r.id IS NULL THEN false
          ELSE true
        END AS is_reported,

        CASE
          WHEN r.id IS NULL
          THEN 'Phòng ban chưa gửi báo cáo tháng'
          ELSE 'Phòng ban đã gửi báo cáo tháng'
        END AS message

      FROM tasks t

      JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id

      LEFT JOIN units un
        ON t.unit_id = un.id

      LEFT JOIN LATERAL (
        SELECT id
        FROM task_periodic_reports r
        WHERE r.task_id = t.id
          AND r.period_key = $1
        ORDER BY r.created_at DESC
        LIMIT 1
      ) r ON true

      WHERE t.deleted_at IS NULL
        AND ${shouldReportCondition}

      ORDER BY is_reported ASC, t.han_chot ASC
      `,
      [currentPeriodKey]
    );

    return result.rows;
  }

  // =======================
  // TRƯỞNG PHÒNG
  // Xem nhiệm vụ trong đơn vị cần gửi báo cáo tháng
  // =======================
  if (
    user.permissions.includes("task:view_unit") &&
    user.unit_id
  ) {
    const result = await pool.query(
      `
      SELECT
        'task_report_due' AS type,
        t.id AS task_id,
        NULL::int AS subtask_id,
        t.tieu_de AS task_title,
        NULL::text AS subtask_title,
        un.name AS unit_name,
        'hang_thang' AS chu_ky_bao_cao,
        t.han_chot,
        NULL::text AS reporter_name,

        CASE
          WHEN r.id IS NULL THEN false
          ELSE true
        END AS is_reported,

        CASE
          WHEN r.id IS NULL
          THEN 'Bạn cần gửi báo cáo tháng cho nhiệm vụ này'
          ELSE 'Đã gửi báo cáo tháng cho nhiệm vụ này'
        END AS message

      FROM tasks t

      JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id

      LEFT JOIN units un
        ON t.unit_id = un.id

      LEFT JOIN LATERAL (
        SELECT id
        FROM task_periodic_reports r
        WHERE r.task_id = t.id
          AND r.reporter_id = $2
          AND r.period_key = $1
        ORDER BY r.created_at DESC
        LIMIT 1
      ) r ON true

      WHERE t.deleted_at IS NULL
        AND t.unit_id = $3
        AND ${shouldReportCondition}

      ORDER BY is_reported ASC, t.han_chot ASC
      `,
      [
        currentPeriodKey,
        user.userId || user.id,
        user.unit_id,
      ]
    );

    return result.rows;
  }

  // Nhân viên dùng /employee-reports/due
  return [];
};
// =======================
// GET MONTHLY DUE REPORT
// Lấy dữ liệu lập báo cáo tháng của phòng ban
// =======================
exports.getMonthlyDueReport = async (user, filters = {}) => {
  const period = getCurrentPeriod(filters.period_key);

  const canViewAll = user.permissions.includes("task:view_all");
  const canViewUnit = user.permissions.includes("task:view_unit");

  if (!canViewAll && !canViewUnit) {
    throw new Error("Không có quyền xem báo cáo tháng phòng ban");
  }

  const now = new Date();

  const canSubmit =
    now >= period.report_open_at &&
    now <= period.due_at;

  const values = [
  period.period_start,
  period.period_end,
  period.period_key,
];

let unitFilter = "";

if (!canViewAll) {
  values.push(user.unit_id);
  unitFilter = `AND t.unit_id = $${values.length}`;
}

  const taskResult = await pool.query(
    `
    SELECT
      t.id AS task_id,
      t.tieu_de AS task_title,
      t.mo_ta,
      t.han_chot,
      t.created_at,
      t.completed_at,
      t.unit_id,

      un.name AS unit_name,

      CASE
        WHEN unit_report.id IS NULL THEN false
        ELSE true
      END AS is_unit_reported,

      unit_report.id AS unit_report_id,
      unit_report.created_at AS unit_reported_at,

      tt.code AS status_code,
      tt.name AS status_name,

      COALESCE(sub.total_subtasks, 0) AS total_subtasks,
      COALESCE(sub.done_subtasks, 0) AS done_subtasks,
      CASE
  WHEN tt.code = 'hoan_thanh' THEN 100
  WHEN COALESCE(sub.total_subtasks, 0) = 0 THEN
    CASE tt.code
      WHEN 'cho_nhan_viec' THEN 0
      WHEN 'cho_xac_nhan_don_vi' THEN 10
      WHEN 'da_giao_nhiem_vu' THEN 20
      WHEN 'dang_thuc_hien' THEN 50
      WHEN 'cho_duyet' THEN 80
      WHEN 'yeu_cau_chinh_sua' THEN 60
      ELSE 0
    END
  ELSE COALESCE(sub.avg_progress, 0)
END AS progress_snapshot

    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN units un
  ON t.unit_id = un.id

    LEFT JOIN LATERAL (
      SELECT
        r.id,
        r.created_at
      FROM task_periodic_reports r
      WHERE r.unit_id = t.unit_id
        AND r.period_key = $3
        AND r.report_type = 'unit_monthly'
      ORDER BY r.created_at DESC
      LIMIT 1
    ) unit_report ON true

    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_subtasks,
        COUNT(*) FILTER (
          WHERE s.trang_thai = 'hoan_thanh'
        ) AS done_subtasks,
        ROUND(
          AVG(
            CASE s.trang_thai
              WHEN 'cho_nhan_viec' THEN 0
              WHEN 'dang_thuc_hien' THEN 50
              WHEN 'cho_duyet' THEN 80
              WHEN 'yeu_cau_chinh_sua' THEN 60
              WHEN 'hoan_thanh' THEN 100
              ELSE 0
            END
          )
        ) AS avg_progress
      FROM subtasks s
      WHERE s.task_id = t.id
    ) sub ON true

    WHERE t.deleted_at IS NULL

      -- Nhiệm vụ phát sinh trước hoặc trong tháng báo cáo
      AND t.created_at <= $2

      -- Chưa hoàn thành, hoặc hoàn thành trong tháng báo cáo
      AND (
        t.completed_at IS NULL
        OR t.completed_at >= $1
      )

      ${unitFilter}

    ORDER BY un.name ASC, t.han_chot ASC
    `,
    values
  );

  const reportValues = [
    period.period_key,
  ];

  let reportFilter = "";

  if (!canViewAll) {
    reportValues.push(user.unit_id);
    reportFilter = `AND r.unit_id = $${reportValues.length}`;
  }

  const reportResult = await pool.query(
    `
    SELECT
      r.id,
      r.unit_id,
      r.period_key,
      r.created_at,
      un.name AS unit_name
    FROM task_periodic_reports r

    LEFT JOIN units un
      ON r.unit_id = un.id

    WHERE r.period_key = $1
      AND r.report_type = 'unit_monthly'
      ${reportFilter}

    ORDER BY r.created_at DESC
    `,
    reportValues
  );

  const tasks = taskResult.rows;

const unitIds = [
  ...new Set(
    tasks
      .map((item) => item.unit_id)
      .filter(Boolean)
  ),
];

const reportedUnitIds = new Set(
  tasks
    .filter((item) => item.is_unit_reported)
    .map((item) => item.unit_id)
);

const allUnitsReported =
  unitIds.length > 0 &&
  unitIds.every((unitId) => reportedUnitIds.has(unitId));

return {
  period_key: period.period_key,
  period_start: period.period_start,
  period_end: period.period_end,
  report_open_at: period.report_open_at,
  due_at: period.due_at,
  can_submit: canSubmit,

  is_reported: canViewAll
    ? allUnitsReported
    : reportResult.rows.length > 0,

  report: reportResult.rows[0] || null,
  reports: reportResult.rows,
  tasks,
};
};
// =======================
// CREATE MONTHLY UNIT REPORT
// Trưởng phòng gửi 1 báo cáo tháng của phòng
// =======================
exports.createMonthlyUnitReport = async (
  data,
  file,
  user
) => {
  const currentUserId = Number(user.userId || user.id);

  if (!user.permissions.includes("approve_level_1")) {
    throw new Error("Không có quyền gửi báo cáo tháng của phòng");
  }

  const {
    noi_dung,
    kho_khan,
    de_xuat,
  } = data;

  const taskIds = normalizeArray(data.task_ids);
  const itemNotes = normalizeObject(data.item_notes);

  if (!noi_dung || !noi_dung.trim()) {
    throw new Error("Vui lòng nhập nội dung báo cáo");
  }

  if (!user.unit_id) {
    throw new Error("Không xác định được phòng ban của người dùng");
  }

  const period = getCurrentPeriod();
  const now = new Date();

  if (now < period.report_open_at) {
    throw new Error(
      `Chưa đến thời gian nộp báo cáo. Có thể nộp từ ngày ${period.report_open_at.toLocaleDateString("vi-VN")}`
    );
  }

  const exists = await pool.query(
    `
    SELECT id
    FROM task_periodic_reports
    WHERE unit_id = $1
      AND period_key = $2
      AND report_type = 'unit_monthly'
    LIMIT 1
    `,
    [
      user.unit_id,
      period.period_key,
    ]
  );

  if (exists.rows.length > 0) {
    throw new Error("Phòng ban đã gửi báo cáo tháng này");
  }

  const values = [
    user.unit_id,
    period.period_start,
    period.period_end,
  ];

  let taskFilter = "";

  if (taskIds.length > 0) {
    values.push(taskIds);

    taskFilter = `
      AND t.id = ANY($${values.length})
    `;
  }

  const taskResult = await pool.query(
    `
    SELECT
      t.id AS task_id,
      t.tieu_de AS task_title,
      t.han_chot,
      t.unit_id,

      tt.code AS status_code,
      COALESCE(sub.total_subtasks, 0) AS total_subtasks,

      CASE
  WHEN tt.code = 'hoan_thanh' THEN 100
  WHEN COALESCE(sub.total_subtasks, 0) = 0 THEN
    CASE tt.code
      WHEN 'cho_nhan_viec' THEN 0
      WHEN 'cho_xac_nhan_don_vi' THEN 10
      WHEN 'da_giao_nhiem_vu' THEN 20
      WHEN 'dang_thuc_hien' THEN 50
      WHEN 'cho_duyet' THEN 80
      WHEN 'yeu_cau_chinh_sua' THEN 60
      ELSE 0
    END
  ELSE COALESCE(sub.avg_progress, 0)
END AS progress_snapshot

    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_subtasks,
    ROUND(
      AVG(
        CASE s.trang_thai
          WHEN 'cho_nhan_viec' THEN 0
          WHEN 'dang_thuc_hien' THEN 50
          WHEN 'cho_duyet' THEN 80
          WHEN 'yeu_cau_chinh_sua' THEN 60
          WHEN 'hoan_thanh' THEN 100
          ELSE 0
        END
      )
    ) AS avg_progress
  FROM subtasks s
  WHERE s.task_id = t.id
) sub ON true

    WHERE t.deleted_at IS NULL
      AND t.unit_id = $1

      AND t.created_at <= $3

      AND (
        t.completed_at IS NULL
        OR t.completed_at >= $2
      )

      ${taskFilter}

    ORDER BY t.han_chot ASC
    `,
    values
  );

  if (taskResult.rows.length === 0) {
    throw new Error("Không có nhiệm vụ phù hợp để lập báo cáo tháng");
  }

  const tasks = taskResult.rows;

  const totalTasks = tasks.length;

  const progress = Math.round(
    tasks.reduce(
      (sum, item) => sum + Number(item.progress_snapshot || 0),
      0
    ) / totalTasks
  );

  const fileName = file
    ? safeFileName(decodeFileName(file.originalname))
    : null;

  const filePath = file
    ? `/uploads/task-reports/${file.filename}`
    : null;

  const fileType = file ? file.mimetype : null;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reportResult = await client.query(
      `
      INSERT INTO task_periodic_reports
      (
        task_id,
        unit_id,
        reporter_id,
        report_type,
        noi_dung,
        kho_khan,
        de_xuat,
        ti_le_hoan_thanh,
        status_snapshot,
        period_key,
        ky_bao_cao_tu,
        ky_bao_cao_den,
        han_bao_cao,
        report_status,
        file_name,
        file_path,
        file_type
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
      `,
      [
        null,
        user.unit_id,
        currentUserId,
        "unit_monthly",
        noi_dung.trim(),
        kho_khan || null,
        de_xuat || null,
        progress,
        "unit_monthly_summary",
        period.period_key,
        period.period_start,
        period.period_end,
        period.due_at,
        "submitted",
        fileName,
        filePath,
        fileType,
      ]
    );

    const report = reportResult.rows[0];

    for (const item of tasks) {
      const note =
        itemNotes[item.task_id] ||
        itemNotes[String(item.task_id)] ||
        null;

      await client.query(
        `
        INSERT INTO task_periodic_report_items
        (
          report_id,
          task_id,
          task_title,
          status_snapshot,
          progress_snapshot,
          deadline_snapshot,
          note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          report.id,
          item.task_id,
          item.task_title,
          item.status_code,
          Number(item.progress_snapshot || 0),
          item.han_chot,
          note,
        ]
      );
    }

    await client.query("COMMIT");

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
          type: "report_unit_monthly",
          title: "Có báo cáo tháng mới của phòng ban",
          content: `Kỳ báo cáo: ${period.period_key}`,
        })
      )
    );

    await createLog(
  tasks[0].task_id,
  currentUserId,
  `Gửi báo cáo tháng ${period.period_key} của phòng ban`
);

emitReportChanged("created", report.id, {
  reportType: "unit_monthly",
  periodKey: period.period_key,
  unitId: user.unit_id,
  reporterId: currentUserId,
});

return report;


  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
// =======================
// GET MONTHLY UNIT REPORT DETAIL
// =======================
exports.getMonthlyUnitReportById = async (
  reportId,
  user
) => {
  const result = await pool.query(
    `
    SELECT
      r.*,
      u.full_name AS reporter_name,
      u.username AS reporter_username,
      un.name AS unit_name
    FROM task_periodic_reports r

    LEFT JOIN users u
      ON r.reporter_id = u.id

    LEFT JOIN units un
      ON r.unit_id = un.id

    WHERE r.id = $1
      AND r.report_type = 'unit_monthly'
    `,
    [reportId]
  );

  if (result.rows.length === 0) {
    throw new Error("Báo cáo tháng không tồn tại");
  }

  const report = result.rows[0];

  const canView =
    user.permissions.includes("task:view_all") ||
    (
      user.permissions.includes("task:view_unit") &&
      Number(report.unit_id) === Number(user.unit_id)
    );

  if (!canView) {
    throw new Error("Không có quyền xem báo cáo này");
  }

  const itemsResult = await pool.query(
    `
    SELECT *
    FROM task_periodic_report_items
    WHERE report_id = $1
    ORDER BY deadline_snapshot ASC NULLS LAST
    `,
    [reportId]
  );

  return {
    ...report,
    items: itemsResult.rows,
  };
};
// =======================
// EXPORT REPORTS TO EXCEL
// Xuất danh sách báo cáo tổng hợp
// =======================
exports.exportReportsExcel = async (user, filters = {}) => {
  const reportResult = await exports.getAllReports(user, {
    ...filters,
    page: 1,
    limit: 10000,
  });

  const reports = reportResult.data || [];

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Hệ thống quản lý tiến độ nhiệm vụ";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Báo cáo tổng hợp");

  const columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Loại báo cáo", key: "report_type", width: 24 },
    { header: "Kỳ báo cáo", key: "period_key", width: 16 },
    { header: "Nội dung tổng hợp", key: "task_title", width: 42 },
    { header: "Người báo cáo", key: "reporter_name", width: 28 },
    { header: "Phòng ban", key: "unit_name", width: 28 },
    { header: "Nội dung", key: "noi_dung", width: 50 },
    { header: "Khó khăn", key: "kho_khan", width: 40 },
    { header: "Đề xuất", key: "de_xuat", width: 40 },
    { header: "Tỉ lệ hoàn thành", key: "ti_le_hoan_thanh", width: 18 },
    { header: "Ngày gửi", key: "created_at", width: 24 },
  ];

  // =======================
  // TITLE
  // =======================
  worksheet.mergeCells("A1:K1");

  const titleCell = worksheet.getCell("A1");

  titleCell.value =
    "BÁO CÁO TỔNG HỢP TÌNH HÌNH THỰC HIỆN NHIỆM VỤ";

  titleCell.font = {
    bold: true,
    size: 16,
  };

  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(1).height = 30;

  worksheet.mergeCells("A2:K2");

  const exportInfoCell = worksheet.getCell("A2");

  exportInfoCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleString(
    "vi-VN"
  )}`;

  exportInfoCell.font = {
    italic: true,
    size: 11,
    color: { argb: "FF6B7280" },
  };

  exportInfoCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(2).height = 22;

  // =======================
  // HEADER TABLE - ROW 4
  // =======================
  columns.forEach((col, index) => {
    const cell = worksheet.getCell(4, index + 1);

    cell.value = col.header;

    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getColumn(index + 1).width = col.width;
  });

  worksheet.getRow(4).height = 28;

  // =======================
  // DATA ROWS - FROM ROW 5
  // =======================
  reports.forEach((item, index) => {
    const rowIndex = index + 5;

    const rowValues = [
      index + 1,
      item.report_source === "employee_report"
        ? "Báo cáo cá nhân"
        : "Báo cáo phòng ban",
      item.period_key || "",
      item.report_source === "employee_report"
        ? `Báo cáo cá nhân tháng ${item.period_key || ""}`
        : item.task_title || "Báo cáo tháng của phòng ban",
      item.reporter_name || item.reporter_username || "",
      item.unit_name || "",
      item.noi_dung || "",
      item.kho_khan || "",
      item.de_xuat || "",
      item.ti_le_hoan_thanh != null
        ? `${item.ti_le_hoan_thanh}%`
        : "0%",
      item.created_at
        ? new Date(item.created_at).toLocaleString("vi-VN")
        : "",
    ];

    const row = worksheet.getRow(rowIndex);

    rowValues.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1);

      cell.value = value;

      cell.alignment = {
        vertical: "top",
        wrapText: true,
      };

      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    row.height = 42;
  });

  // =======================
  // EMPTY STATE
  // =======================
  if (reports.length === 0) {
    worksheet.mergeCells("A5:K5");

    const emptyCell = worksheet.getCell("A5");

    emptyCell.value = "Không có dữ liệu báo cáo";
    emptyCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    emptyCell.font = {
      italic: true,
      color: { argb: "FF6B7280" },
    };

    worksheet.getRow(5).height = 28;
  }

  // =======================
  // FILTER + FREEZE
  // =======================
  worksheet.autoFilter = {
    from: "A4",
    to: "K4",
  };

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 4,
    },
  ];

  return workbook.xlsx.writeBuffer();
};