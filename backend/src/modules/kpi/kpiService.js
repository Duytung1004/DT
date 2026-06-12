const pool = require("../../config/db");

const getKpiLevel = (score) => {
  if (score >= 90) return "Xuất sắc";
  if (score >= 75) return "Tốt";
  if (score >= 60) return "Đạt";
  if (score >= 40) return "Cần cải thiện";
  return "Không đạt";
};

const round = (value) => {
  return Math.round(Number(value || 0) * 10) / 10;
};
const pad2 = (value) => String(value).padStart(2, "0");
exports.getKpiOverview = async (user) => {
  const roleId = Number(user.roleId || user.role_id);
  const userId = Number(user.userId || user.id);
  const unitId = Number(user.unit_id);

  let where = "WHERE t.deleted_at IS NULL";
  const params = [];

  // Lãnh đạo + admin: xem toàn hệ thống
  if (roleId === 1 || roleId === 2) {
    // không thêm filter
  }

  // Trưởng phòng: xem phòng ban mình
  else if (roleId === 3) {
    params.push(unitId);
    where += ` AND t.unit_id = $${params.length}`;
  }

  // Nhân viên: tính theo task có subtask giao cho mình
  else if (roleId === 4) {
    params.push(userId);
    where += `
      AND EXISTS (
        SELECT 1
        FROM subtasks st
        WHERE st.task_id = t.id
        AND st.assignee_user_id = $${params.length}
      )
    `;
  }

  const taskResult = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total_tasks,

      COUNT(*) FILTER (
        WHERE tt.code = 'hoan_thanh'
      )::int AS completed_tasks,

      COUNT(*) FILTER (
        WHERE tt.code = 'hoan_thanh'
        AND (
          t.completed_at IS NULL
          OR t.han_chot IS NULL
          OR t.completed_at <= t.han_chot
        )
      )::int AS on_time_completed_tasks,

      COUNT(*) FILTER (
        WHERE t.han_chot < NOW()
        AND tt.code <> 'hoan_thanh'
      )::int AS overdue_tasks
    FROM tasks t
    LEFT JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id
    ${where}
    `,
    params
  );

  const taskStats = taskResult.rows[0];

  const progressResult = await pool.query(
    `
    SELECT
      COALESCE(
        AVG(
          CASE
            WHEN st.trang_thai = 'cho_nhan_viec' THEN 0
            WHEN st.trang_thai = 'dang_thuc_hien' THEN 50
            WHEN st.trang_thai = 'yeu_cau_chinh_sua' THEN 60
            WHEN st.trang_thai = 'cho_duyet' THEN 80
            WHEN st.trang_thai = 'hoan_thanh' THEN 100
            ELSE 0
          END
        ),
        0
      )::numeric AS avg_progress
    FROM subtasks st
    JOIN tasks t
      ON st.task_id = t.id
    LEFT JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id
    ${where.replaceAll("t.", "t.")}
    `,
    params
  );

  const reportResult = await pool.query(
    `
    SELECT
      COUNT(DISTINCT t.id)::int AS reported_tasks
    FROM tasks t
    LEFT JOIN task_submissions ts
      ON ts.task_id = t.id
    LEFT JOIN subtasks st
      ON st.task_id = t.id
    LEFT JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id
    ${where}
    AND (
      ts.id IS NOT NULL
      OR st.noi_dung_nop IS NOT NULL
      OR st.file_path IS NOT NULL
    )
    `,
    params
  );

  const totalTasks = Number(taskStats.total_tasks || 0);
  const completedTasks = Number(taskStats.completed_tasks || 0);
  const onTimeCompletedTasks = Number(
    taskStats.on_time_completed_tasks || 0
  );
  const overdueTasks = Number(taskStats.overdue_tasks || 0);
  const avgProgress = Number(progressResult.rows[0].avg_progress || 0);
  const reportedTasks = Number(reportResult.rows[0].reported_tasks || 0);

  const completionRate =
    totalTasks > 0 ? completedTasks / totalTasks : 0;

  const onTimeRate =
    completedTasks > 0
      ? onTimeCompletedTasks / completedTasks
      : 0;

  const reportRate =
    totalTasks > 0 ? reportedTasks / totalTasks : 0;

  const completionScore = completionRate * 40;
  const onTimeScore = onTimeRate * 30;
  const progressScore = (avgProgress / 100) * 20;
  const reportScore = reportRate * 10;

  const kpiScore =
    completionScore +
    onTimeScore +
    progressScore +
    reportScore;

  return {
    scope:
      roleId === 1 || roleId === 2
        ? "system"
        : roleId === 3
        ? "unit"
        : "personal",

    summary: {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      on_time_completed_tasks: onTimeCompletedTasks,
      overdue_tasks: overdueTasks,
      reported_tasks: reportedTasks,
      avg_progress: round(avgProgress),
    },

    rates: {
      completion_rate: round(completionRate * 100),
      on_time_rate: round(onTimeRate * 100),
      report_rate: round(reportRate * 100),
    },

    scores: {
      completion_score: round(completionScore),
      on_time_score: round(onTimeScore),
      progress_score: round(progressScore),
      report_score: round(reportScore),
      total_score: round(kpiScore),
    },

    level: getKpiLevel(kpiScore),
  };
};
const calculateKpiScore = ({
  total,
  completed,
  onTimeCompleted,
  avgProgress,
  reported,
}) => {
  const totalTasks = Number(total || 0);
  const completedTasks = Number(completed || 0);
  const onTime = Number(onTimeCompleted || 0);
  const progress = Number(avgProgress || 0);
  const reportedTasks = Number(reported || 0);

  const completionRate =
    totalTasks > 0 ? completedTasks / totalTasks : 0;

  const onTimeRate =
    completedTasks > 0 ? onTime / completedTasks : 0;

  const reportRate =
    totalTasks > 0 ? reportedTasks / totalTasks : 0;

  const completionScore = completionRate * 40;
  const onTimeScore = onTimeRate * 30;
  const progressScore = (progress / 100) * 20;
  const reportScore = reportRate * 10;

  const totalScore =
    completionScore +
    onTimeScore +
    progressScore +
    reportScore;

  return {
    completion_rate: round(completionRate * 100),
    on_time_rate: round(onTimeRate * 100),
    report_rate: round(reportRate * 100),
    avg_progress: round(progress),

    completion_score: round(completionScore),
    on_time_score: round(onTimeScore),
    progress_score: round(progressScore),
    report_score: round(reportScore),
    total_score: round(totalScore),
    level: getKpiLevel(totalScore),
  };
};

exports.getKpiRankings = async (user) => {
  const roleId = Number(user.roleId || user.role_id);
  const unitId = Number(user.unit_id);

  let unitWhere = "WHERE t.deleted_at IS NULL";
  const unitParams = [];

  let userWhere = "WHERE t.deleted_at IS NULL";
  const userParams = [];

  // Trưởng phòng chỉ xem xếp hạng trong phòng ban mình
  if (roleId === 3) {
    unitParams.push(unitId);
    unitWhere += ` AND t.unit_id = $${unitParams.length}`;

    userParams.push(unitId);
    userWhere += ` AND t.unit_id = $${userParams.length}`;
  }

  // Nhân viên không cần xem bảng xếp hạng toàn hệ thống
  if (roleId === 4) {
    return {
      scope: "personal",
      departments: [],
      users: [],
    };
  }

  const departmentResult = await pool.query(
    `
    WITH base AS (
      SELECT
        u.id AS unit_id,
        u.name AS unit_name,

        COUNT(DISTINCT t.id)::int AS total_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE tt.code = 'hoan_thanh'
        )::int AS completed_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE tt.code = 'hoan_thanh'
          AND (
            t.completed_at IS NULL
            OR t.han_chot IS NULL
            OR t.completed_at <= t.han_chot
          )
        )::int AS on_time_completed_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE t.han_chot < NOW()
          AND tt.code <> 'hoan_thanh'
        )::int AS overdue_tasks,

        COALESCE(
          AVG(
            CASE
              WHEN st.trang_thai = 'cho_nhan_viec' THEN 0
              WHEN st.trang_thai = 'dang_thuc_hien' THEN 50
              WHEN st.trang_thai = 'yeu_cau_chinh_sua' THEN 60
              WHEN st.trang_thai = 'cho_duyet' THEN 80
              WHEN st.trang_thai = 'hoan_thanh' THEN 100
              ELSE 0
            END
          ),
          0
        )::numeric AS avg_progress,

        COUNT(DISTINCT t.id) FILTER (
          WHERE st.noi_dung_nop IS NOT NULL
             OR st.file_path IS NOT NULL
        )::int AS reported_tasks

      FROM tasks t
      JOIN units u
        ON t.unit_id = u.id
      LEFT JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id
      LEFT JOIN subtasks st
        ON st.task_id = t.id
      ${unitWhere}
      GROUP BY u.id, u.name
    )
    SELECT *
    FROM base
    ORDER BY unit_name ASC
    `,
    unitParams
  );

  const userResult = await pool.query(
    `
    WITH base AS (
      SELECT
        us.id AS user_id,
        COALESCE(us.full_name, us.username) AS full_name,
        un.name AS unit_name,

        COUNT(DISTINCT t.id)::int AS total_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE st.trang_thai = 'hoan_thanh'
        )::int AS completed_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE st.trang_thai = 'hoan_thanh'
          AND (
            st.completed_at IS NULL
            OR st.han_chot IS NULL
            OR st.completed_at <= st.han_chot
          )
        )::int AS on_time_completed_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE st.han_chot < NOW()
          AND st.trang_thai <> 'hoan_thanh'
        )::int AS overdue_tasks,

        COALESCE(
          AVG(
            CASE
              WHEN st.trang_thai = 'cho_nhan_viec' THEN 0
              WHEN st.trang_thai = 'dang_thuc_hien' THEN 50
              WHEN st.trang_thai = 'yeu_cau_chinh_sua' THEN 60
              WHEN st.trang_thai = 'cho_duyet' THEN 80
              WHEN st.trang_thai = 'hoan_thanh' THEN 100
              ELSE 0
            END
          ),
          0
        )::numeric AS avg_progress,

        COUNT(DISTINCT t.id) FILTER (
          WHERE st.noi_dung_nop IS NOT NULL
             OR st.file_path IS NOT NULL
        )::int AS reported_tasks

      FROM subtasks st
      JOIN tasks t
        ON st.task_id = t.id
      JOIN users us
        ON st.assignee_user_id = us.id
      LEFT JOIN units un
        ON us.unit_id = un.id
      LEFT JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id
      ${userWhere}
      GROUP BY us.id, us.full_name, us.username, un.name
    )
    SELECT *
    FROM base
    ORDER BY full_name ASC
    `,
    userParams
  );

  const departments = departmentResult.rows
    .map((row) => {
      const score = calculateKpiScore({
        total: row.total_tasks,
        completed: row.completed_tasks,
        onTimeCompleted: row.on_time_completed_tasks,
        avgProgress: row.avg_progress,
        reported: row.reported_tasks,
      });

      return {
        unit_id: row.unit_id,
        unit_name: row.unit_name,
        total_tasks: Number(row.total_tasks || 0),
        completed_tasks: Number(row.completed_tasks || 0),
        overdue_tasks: Number(row.overdue_tasks || 0),
        ...score,
      };
    })
    .sort((a, b) => b.total_score - a.total_score)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

  const users = userResult.rows
    .map((row) => {
      const score = calculateKpiScore({
        total: row.total_tasks,
        completed: row.completed_tasks,
        onTimeCompleted: row.on_time_completed_tasks,
        avgProgress: row.avg_progress,
        reported: row.reported_tasks,
      });

      return {
        user_id: row.user_id,
        full_name: row.full_name,
        unit_name: row.unit_name,
        total_tasks: Number(row.total_tasks || 0),
        completed_tasks: Number(row.completed_tasks || 0),
        overdue_tasks: Number(row.overdue_tasks || 0),
        ...score,
      };
    })
    .sort((a, b) => b.total_score - a.total_score)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

  return {
    scope:
      roleId === 1 || roleId === 2
        ? "system"
        : "unit",
    departments,
    users,
  };
};
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

  return {
    period_key: `${year}-${pad2(monthIndex + 1)}`,
    period_start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
    period_end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
};

exports.getKpiMonthlyOverview = async (user, filters = {}) => {
  const roleId = Number(user.roleId || user.role_id);
  const userId = Number(user.userId || user.id);
  const unitId = Number(user.unit_id);

  const period = getCurrentPeriod(filters.period_key);

  // =========================
  // NHÂN VIÊN: KPI theo phần việc cá nhân
  // =========================
  if (roleId === 4) {
    const result = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_tasks,

        COUNT(*) FILTER (
          WHERE st.trang_thai = 'hoan_thanh'
        )::int AS completed_tasks,

        COUNT(*) FILTER (
          WHERE st.trang_thai = 'hoan_thanh'
          AND (
            st.completed_at IS NULL
            OR st.han_chot IS NULL
            OR st.completed_at <= st.han_chot
          )
        )::int AS on_time_completed_tasks,

        COUNT(*) FILTER (
          WHERE st.han_chot < $3
          AND st.trang_thai <> 'hoan_thanh'
        )::int AS overdue_tasks,

        COALESCE(
          AVG(
            CASE
              WHEN st.trang_thai = 'cho_nhan_viec' THEN 0
              WHEN st.trang_thai = 'dang_thuc_hien' THEN 50
              WHEN st.trang_thai = 'yeu_cau_chinh_sua' THEN 60
              WHEN st.trang_thai = 'cho_duyet' THEN 80
              WHEN st.trang_thai = 'hoan_thanh' THEN 100
              ELSE 0
            END
          ),
          0
        )::numeric AS avg_progress,

        COUNT(*) FILTER (
          WHERE st.noi_dung_nop IS NOT NULL
             OR st.file_path IS NOT NULL
        )::int AS reported_tasks

      FROM subtasks st

      JOIN tasks t
        ON st.task_id = t.id

      WHERE st.assignee_user_id = $1
        AND t.deleted_at IS NULL

        AND st.created_at <= $3

        AND (
          st.completed_at IS NULL
          OR st.completed_at >= $2
        )
      `,
      [
        userId,
        period.period_start,
        period.period_end,
      ]
    );

    const row = result.rows[0];

    const score = calculateKpiScore({
      total: row.total_tasks,
      completed: row.completed_tasks,
      onTimeCompleted: row.on_time_completed_tasks,
      avgProgress: row.avg_progress,
      reported: row.reported_tasks,
    });

    return {
      scope: "personal",
      period_key: period.period_key,
      summary: {
        total_tasks: Number(row.total_tasks || 0),
        completed_tasks: Number(row.completed_tasks || 0),
        on_time_completed_tasks: Number(row.on_time_completed_tasks || 0),
        overdue_tasks: Number(row.overdue_tasks || 0),
        reported_tasks: Number(row.reported_tasks || 0),
        avg_progress: score.avg_progress,
      },
      rates: {
        completion_rate: score.completion_rate,
        on_time_rate: score.on_time_rate,
        report_rate: score.report_rate,
      },
      scores: {
        completion_score: score.completion_score,
        on_time_score: score.on_time_score,
        progress_score: score.progress_score,
        report_score: score.report_score,
        total_score: score.total_score,
      },
      level: score.level,
    };
  }

  // =========================
  // LÃNH ĐẠO / TRƯỞNG PHÒNG: KPI theo nhiệm vụ
  // =========================
  const values = [
    period.period_start,
    period.period_end,
  ];

  let unitFilter = "";

  if (roleId === 3) {
    values.push(unitId);
    unitFilter = `AND t.unit_id = $${values.length}`;
  }

  const result = await pool.query(
    `
    SELECT
      COUNT(DISTINCT t.id)::int AS total_tasks,

      COUNT(DISTINCT t.id) FILTER (
        WHERE tt.code = 'hoan_thanh'
      )::int AS completed_tasks,

      COUNT(DISTINCT t.id) FILTER (
        WHERE tt.code = 'hoan_thanh'
        AND (
          t.completed_at IS NULL
          OR t.han_chot IS NULL
          OR t.completed_at <= t.han_chot
        )
      )::int AS on_time_completed_tasks,

      COUNT(DISTINCT t.id) FILTER (
        WHERE t.han_chot < $2
        AND tt.code <> 'hoan_thanh'
      )::int AS overdue_tasks,

      COALESCE(
        AVG(
          CASE
            WHEN st.trang_thai = 'cho_nhan_viec' THEN 0
            WHEN st.trang_thai = 'dang_thuc_hien' THEN 50
            WHEN st.trang_thai = 'yeu_cau_chinh_sua' THEN 60
            WHEN st.trang_thai = 'cho_duyet' THEN 80
            WHEN st.trang_thai = 'hoan_thanh' THEN 100
            ELSE 0
          END
        ),
        0
      )::numeric AS avg_progress,

      COUNT(DISTINCT t.id) FILTER (
        WHERE st.noi_dung_nop IS NOT NULL
           OR st.file_path IS NOT NULL
      )::int AS reported_tasks

    FROM tasks t

    LEFT JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN subtasks st
      ON st.task_id = t.id

    WHERE t.deleted_at IS NULL

      AND t.created_at <= $2

      AND (
        t.completed_at IS NULL
        OR t.completed_at >= $1
      )

      ${unitFilter}
    `,
    values
  );

  const row = result.rows[0];

  const score = calculateKpiScore({
    total: row.total_tasks,
    completed: row.completed_tasks,
    onTimeCompleted: row.on_time_completed_tasks,
    avgProgress: row.avg_progress,
    reported: row.reported_tasks,
  });

  return {
    scope:
      roleId === 1 || roleId === 2
        ? "system"
        : "unit",

    period_key: period.period_key,

    summary: {
      total_tasks: Number(row.total_tasks || 0),
      completed_tasks: Number(row.completed_tasks || 0),
      on_time_completed_tasks: Number(row.on_time_completed_tasks || 0),
      overdue_tasks: Number(row.overdue_tasks || 0),
      reported_tasks: Number(row.reported_tasks || 0),
      avg_progress: score.avg_progress,
    },

    rates: {
      completion_rate: score.completion_rate,
      on_time_rate: score.on_time_rate,
      report_rate: score.report_rate,
    },

    scores: {
      completion_score: score.completion_score,
      on_time_score: score.on_time_score,
      progress_score: score.progress_score,
      report_score: score.report_score,
      total_score: score.total_score,
    },

    level: score.level,
  };
};