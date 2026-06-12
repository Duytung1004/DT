const pool = require("../../config/db");

// Lấy user đầy đủ vì token có thể chưa có unit_id
const getCurrentUser = async (user) => {
  const userId = user.userId || user.id;

  const result = await pool.query(
    `
    SELECT 
      id,
      username,
      full_name,
      role_id,
      unit_id
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  return result.rows[0];
};

// ===============================
// 1. Nhiệm vụ trong tháng cần xử lý
// ===============================
const getTaskReminders = async (currentUser) => {
  const values = [];
  let roleFilter = "";

  // Nhân viên: chỉ thấy nhiệm vụ giao cho mình
  if (currentUser.role_id === 4) {
    values.push(currentUser.id);
    roleFilter = `AND t.assignee_user_id = $${values.length}`;
  }

  // Trưởng phòng: thấy nhiệm vụ của phòng mình
  if (currentUser.role_id === 3) {
    values.push(currentUser.unit_id);
    roleFilter = `AND t.unit_id = $${values.length}`;
  }

  // Lãnh đạo: thấy tất cả

  const result = await pool.query(
    `
    SELECT
      'TASK_REMINDER' AS type,

      t.id AS task_id,
      NULL::int AS user_id,
      NULL::int AS subtask_id,

      t.tieu_de AS title,
      t.tieu_de AS task_title,
      NULL::text AS subtask_title,

      t.mo_ta,
      t.han_chot,

      tt.code AS status_code,
      tt.name AS status_name,

      un.name AS unit_name,
      COALESCE(assignee.full_name, assignee.username) AS reporter_name,

      false AS is_reported,

      CASE
        WHEN t.han_chot < CURRENT_DATE
          THEN 'Nhiệm vụ đã quá hạn, cần xử lý ngay'
        WHEN t.han_chot <= CURRENT_DATE + INTERVAL '3 days'
          THEN 'Nhiệm vụ sắp tới hạn'
        ELSE 'Nhiệm vụ cần xử lý trong tháng này'
      END AS message,

      TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS period_key

    FROM tasks t

    LEFT JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN units un
      ON t.unit_id = un.id

    LEFT JOIN users assignee
      ON t.assignee_user_id = assignee.id

    WHERE t.deleted_at IS NULL

      -- Nhiệm vụ trong tháng hiện tại
      AND t.han_chot >= date_trunc('month', CURRENT_DATE)
      AND t.han_chot < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'

      -- Không hiện nhiệm vụ đã hoàn thành
      AND COALESCE(tt.code, '') <> 'hoan_thanh'

      ${roleFilter}

    ORDER BY
      CASE
        WHEN t.han_chot < CURRENT_DATE THEN 1
        WHEN t.han_chot <= CURRENT_DATE + INTERVAL '3 days' THEN 2
        ELSE 3
      END,
      t.han_chot ASC,
      t.id DESC
    `,
    values
  );

  return result.rows;
};

// ========================================
// Lãnh đạo xem phòng nào chưa gửi báo cáo tháng
// ========================================
const getMissingMonthlyReportsForLeader = async () => {
  const result = await pool.query(
    `
    SELECT
      'MISSING_UNIT_MONTHLY_REPORT' AS type,

      NULL::int AS task_id,
      NULL::int AS user_id,
      NULL::int AS subtask_id,

      'Phòng chưa gửi báo cáo tháng' AS title,
      NULL::text AS task_title,
      NULL::text AS subtask_title,

      NULL::text AS mo_ta,
      NULL::date AS han_chot,

      NULL::text AS status_code,
      NULL::text AS status_name,

      un.name AS unit_name,
      NULL::text AS reporter_name,

      false AS is_reported,

      CONCAT(
        un.name,
        ' chưa gửi báo cáo tháng ',
        TO_CHAR(CURRENT_DATE, 'MM/YYYY')
      ) AS message,

      TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS period_key

    FROM units un

    WHERE NOT EXISTS (
      SELECT 1
      FROM task_periodic_reports r
      WHERE r.unit_id = un.id
        AND r.report_type = 'unit_monthly'
        AND r.period_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    )

    ORDER BY un.name ASC
    `
  );

  return result.rows;
};

// ========================================
// 2. Trưởng phòng xem ai chưa báo cáo tháng
// ========================================
const getMissingMonthlyReportsForUnit = async (currentUser) => {
  const result = await pool.query(
    `
    SELECT
      'MISSING_MONTHLY_REPORT' AS type,

      NULL::int AS task_id,
      u.id AS user_id,
      NULL::int AS subtask_id,

      'Chưa gửi báo cáo tháng' AS title,
      NULL::text AS task_title,
      NULL::text AS subtask_title,

      NULL::text AS mo_ta,
      NULL::date AS han_chot,

      NULL::text AS status_code,
      NULL::text AS status_name,

      un.name AS unit_name,
      COALESCE(u.full_name, u.username) AS reporter_name,

      false AS is_reported,

      CONCAT(
        COALESCE(u.full_name, u.username),
        ' chưa gửi báo cáo tháng ',
        TO_CHAR(CURRENT_DATE, 'MM/YYYY')
      ) AS message,

      TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS period_key

    FROM users u

    LEFT JOIN units un
      ON u.unit_id = un.id

    WHERE u.unit_id = $1
      AND u.role_id = 4

      AND NOT EXISTS (
        SELECT 1
        FROM employee_periodic_reports er
        WHERE er.reporter_id = u.id
          AND er.period_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      )

    ORDER BY COALESCE(u.full_name, u.username) ASC
    `,
    [currentUser.unit_id]
  );

  return result.rows;
};

// ========================================
// 3. Nhân viên tự thấy mình chưa báo cáo tháng
// ========================================
const getMyMissingMonthlyReport = async (currentUser) => {
  const result = await pool.query(
    `
    SELECT
      'MY_MONTHLY_REPORT' AS type,

      NULL::int AS task_id,
      u.id AS user_id,
      NULL::int AS subtask_id,

      'Cần gửi báo cáo tháng' AS title,
      NULL::text AS task_title,
      NULL::text AS subtask_title,

      NULL::text AS mo_ta,
      NULL::date AS han_chot,

      NULL::text AS status_code,
      NULL::text AS status_name,

      un.name AS unit_name,
      COALESCE(u.full_name, u.username) AS reporter_name,

      false AS is_reported,

      CONCAT(
        'Bạn chưa gửi báo cáo tháng ',
        TO_CHAR(CURRENT_DATE, 'MM/YYYY')
      ) AS message,

      TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS period_key

    FROM users u

    LEFT JOIN units un
      ON u.unit_id = un.id

    WHERE u.id = $1
      AND u.role_id = 4

      AND NOT EXISTS (
        SELECT 1
        FROM employee_periodic_reports er
        WHERE er.reporter_id = u.id
          AND er.period_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      )
    `,
    [currentUser.id]
  );

  return result.rows;
};

// ===============================
// API tổng cho FloatingTodo
// ===============================
exports.getFloatingTodos = async (user) => {
  const currentUser = await getCurrentUser(user);

  if (!currentUser) {
    return [];
  }

  const taskReminders = await getTaskReminders(currentUser);

 let reportReminders = [];

// Lãnh đạo: xem phòng nào chưa gửi báo cáo tháng
if (currentUser.role_id === 2) {
  reportReminders = await getMissingMonthlyReportsForLeader();
}

// Trưởng phòng: xem phòng còn ai chưa báo cáo tháng
if (currentUser.role_id === 3) {
  reportReminders = await getMissingMonthlyReportsForUnit(currentUser);
}

// Nhân viên: tự thấy mình chưa gửi báo cáo tháng
if (currentUser.role_id === 4) {
  reportReminders = await getMyMissingMonthlyReport(currentUser);
}

  return [
    ...reportReminders,
    ...taskReminders,
  ];
};