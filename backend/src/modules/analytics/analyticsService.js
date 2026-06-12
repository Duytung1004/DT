const pool = require("../../config/db");

const hasPermission = (user, permission) => {
  return (
    Array.isArray(user?.permissions) &&
    user.permissions.includes(permission)
  );
};

const getUserId = (user) => {
  return user?.userId || user?.id;
};

const buildTaskAccessFilter = (user, values) => {
  const userId = getUserId(user);

  const canViewAll =
    hasPermission(user, "task:view_all") ||
    hasPermission(user, "dashboard:leader");

  const canViewUnit =
    hasPermission(user, "task:view_unit") ||
    hasPermission(user, "dashboard:unit");

  const canViewOwn =
    hasPermission(user, "task:view_own") ||
    hasPermission(user, "dashboard:own");

  if (canViewAll) {
    return "";
  }

  if (canViewUnit && user.unit_id) {
    values.push(user.unit_id);
    return ` AND t.unit_id = $${values.length}`;
  }

  if (canViewOwn) {
    values.push(userId);
    const userIndex = values.length;

    return `
      AND (
        t.assignee_user_id = $${userIndex}
        OR EXISTS (
          SELECT 1
          FROM subtasks s
          WHERE s.task_id = t.id
            AND s.assignee_user_id = $${userIndex}
        )
      )
    `;
  }

  return " AND 1 = 0";
};

const buildDateFilter = (query, values) => {
  let filter = "";

  if (query.from) {
    values.push(query.from);
    filter += ` AND t.han_chot >= $${values.length}`;
  }

  if (query.to) {
  values.push(query.to);
  filter += ` AND t.han_chot < ($${values.length}::date + INTERVAL '1 day')`;
}

  if (
    query.unit_id &&
    query.unit_id !== "all" &&
    query.unit_id !== ""
  ) {
    values.push(Number(query.unit_id));
    filter += ` AND t.unit_id = $${values.length}`;
  }

  return filter;
};

const getProgressByStatus = (status) => {
  switch (status) {
    case "hoan_thanh":
      return 100;

    case "cho_duyet":
      return 80;

    case "yeu_cau_chinh_sua":
      return 60;

    case "dang_thuc_hien":
      return 50;

    case "da_giao_nhiem_vu":
      return 25;

    case "cho_xac_nhan_don_vi":
      return 10;

    case "moi":
    case "cho_nhan_viec":
      return 0;

    default:
      return 0;
  }
};

const round = (value) => {
  return Math.round(Number(value || 0) * 10) / 10;
};

const getKpiLevel = (score) => {
  if (score >= 90) return "Xuất sắc";
  if (score >= 75) return "Tốt";
  if (score >= 60) return "Đạt";
  if (score >= 40) return "Cần cải thiện";
  return "Không đạt";
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

const calculateRisk = (task) => {
  let score = 0;
  const reasons = [];

  const progress = Number(task.progress || 0);
  const daysLeft =
    task.days_left === null || task.days_left === undefined
      ? null
      : Number(task.days_left);

  const overdueDays = Number(task.overdue_days || 0);

  // 1. Deadline
  if (overdueDays > 0) {
    score += 40;
    reasons.push(`Nhiệm vụ đã quá hạn ${overdueDays} ngày`);
  } else if (daysLeft !== null) {
    if (daysLeft <= 1) {
      score += 30;
      reasons.push("Còn rất ít thời gian đến hạn chót");
    } else if (daysLeft <= 3) {
      score += 20;
      reasons.push("Còn 2-3 ngày đến hạn chót");
    } else if (daysLeft <= 7) {
      score += 10;
      reasons.push("Sắp đến hạn xử lý");
    }
  }

  // 2. Progress
  if (progress < 30) {
    score += 25;
    reasons.push("Tiến độ thực hiện còn thấp");
  } else if (progress < 60) {
    score += 15;
    reasons.push("Tiến độ chưa đạt mức an toàn");
  } else if (progress < 80) {
    score += 8;
    reasons.push("Tiến độ cần tiếp tục theo dõi");
  }

  // 3. Subtasks
  if (Number(task.total_subtasks || 0) === 0) {
    score += 10;
    reasons.push("Nhiệm vụ chưa có phần việc nội bộ");
  }

  if (Number(task.revision_subtasks || 0) > 0) {
    score += 15;
    reasons.push("Có phần việc bị yêu cầu chỉnh sửa");
  }

  if (Number(task.pending_review_subtasks || 0) > 0) {
    score += 8;
    reasons.push("Có phần việc đang chờ duyệt");
  }

  if (Number(task.unfinished_subtasks || 0) > 0) {
    score += 10;
    reasons.push("Còn phần việc chưa hoàn thành");
  }

  // 4. Priority
  if (task.priority_level === "cao") {
    score += 10;
    reasons.push("Nhiệm vụ có mức ưu tiên cao");
  }

  if (
    task.priority_level === "khan" ||
    task.priority_level === "khẩn" ||
    task.priority_level === "rat_cao"
  ) {
    score += 15;
    reasons.push("Nhiệm vụ có mức ưu tiên khẩn cấp");
  }

  score = Math.min(score, 100);

  let level = "low";
  let label = "Nguy cơ thấp";

  if (score >= 70) {
    level = "high";
    label = "Nguy cơ cao";
  } else if (score >= 40) {
    level = "medium";
    label = "Nguy cơ trung bình";
  }

  return {
    risk_score: score,
    risk_level: level,
    risk_label: label,
    risk_reasons: reasons,
  };
};

exports.getAnalyticsOverview = async (user, query = {}) => {
  const values = [];

  const accessFilter = buildTaskAccessFilter(user, values);
  const dateFilter = buildDateFilter(query, values);

  const whereClause = `
    WHERE t.deleted_at IS NULL
      ${accessFilter}
      ${dateFilter}
  `;

  // =========================
  // SUMMARY
  // =========================
  const summaryResult = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total_tasks,

      COUNT(*) FILTER (
        WHERE tt.code = 'hoan_thanh'
      )::int AS completed_tasks,

      COUNT(*) FILTER (
        WHERE tt.code = 'dang_thuc_hien'
      )::int AS doing_tasks,

      COUNT(*) FILTER (
        WHERE tt.code = 'cho_duyet'
      )::int AS pending_tasks,

      COUNT(*) FILTER (
        WHERE t.han_chot < NOW()
          AND tt.code <> 'hoan_thanh'
      )::int AS overdue_tasks

    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    ${whereClause}
    `,
    values
  );

  const summary = summaryResult.rows[0];

  const totalTasks = Number(summary.total_tasks || 0);
  const completedTasks = Number(summary.completed_tasks || 0);

  summary.completion_rate =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  // =========================
  // TASKS BY STATUS
  // =========================
  const statusResult = await pool.query(
    `
    SELECT
      tt.code AS status_code,
      tt.name AS status_name,
      COUNT(*)::int AS total
    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    ${whereClause}

    GROUP BY tt.code, tt.name
    ORDER BY total DESC
    `,
    values
  );

  // =========================
  // TASKS BY UNIT
  // =========================
  const unitResult = await pool.query(
    `
    SELECT
      COALESCE(un.name, 'Chưa xác định') AS unit_name,
      COUNT(*)::int AS total_tasks,

      COUNT(*) FILTER (
        WHERE tt.code = 'hoan_thanh'
      )::int AS completed_tasks,

      COUNT(*) FILTER (
        WHERE t.han_chot < NOW()
          AND tt.code <> 'hoan_thanh'
      )::int AS overdue_tasks

    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN units un
      ON t.unit_id = un.id

    ${whereClause}

    GROUP BY un.name
    ORDER BY total_tasks DESC
    `,
    values
  );

  const unitChart = unitResult.rows.map((item) => {
    const total = Number(item.total_tasks || 0);
    const completed = Number(item.completed_tasks || 0);

    return {
      ...item,
      completion_rate:
        total === 0
          ? 0
          : Math.round((completed / total) * 100),
    };
  });

  // =========================
  // OVERDUE TASKS
  // =========================
  const overdueResult = await pool.query(
    `
    SELECT
      t.id,
      t.tieu_de,
      t.han_chot,
      tt.code AS status_code,
      tt.name AS status_name,
      COALESCE(un.name, 'Chưa xác định') AS unit_name,

      GREATEST(
        DATE_PART('day', NOW() - t.han_chot),
        0
      )::int AS overdue_days

    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN units un
      ON t.unit_id = un.id

    ${whereClause}
      AND t.han_chot < NOW()
      AND tt.code <> 'hoan_thanh'

    ORDER BY t.han_chot ASC
    LIMIT 10
    `,
    values
  );

  // =========================
  // MONTHLY TREND
  // =========================
  const monthlyResult = await pool.query(
    `
    WITH base AS (
      SELECT
        TO_CHAR(DATE_TRUNC('month', t.created_at), 'YYYY-MM') AS month,

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
              WHEN s.trang_thai = 'cho_nhan_viec' THEN 0
              WHEN s.trang_thai = 'dang_thuc_hien' THEN 50
              WHEN s.trang_thai = 'yeu_cau_chinh_sua' THEN 60
              WHEN s.trang_thai = 'cho_duyet' THEN 80
              WHEN s.trang_thai = 'hoan_thanh' THEN 100
              ELSE get_task_progress.progress
            END
          ),
          0
        )::numeric AS avg_progress,

        COUNT(DISTINCT t.id) FILTER (
          WHERE s.noi_dung_nop IS NOT NULL
             OR s.file_path IS NOT NULL
        )::int AS reported_tasks

      FROM tasks t

      JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id

      LEFT JOIN subtasks s
        ON s.task_id = t.id

      LEFT JOIN LATERAL (
        SELECT
          CASE tt.code
            WHEN 'hoan_thanh' THEN 100
            WHEN 'cho_duyet' THEN 80
            WHEN 'yeu_cau_chinh_sua' THEN 60
            WHEN 'dang_thuc_hien' THEN 50
            WHEN 'da_giao_nhiem_vu' THEN 25
            WHEN 'cho_xac_nhan_don_vi' THEN 10
            ELSE 0
          END AS progress
      ) get_task_progress ON true

      ${whereClause}

      GROUP BY DATE_TRUNC('month', t.created_at)
    )

    SELECT *
    FROM base
    ORDER BY month ASC
    `,
    values
  );

  const monthlyTrend = monthlyResult.rows.map((item) => {
    const score = calculateKpiScore({
      total: item.total_tasks,
      completed: item.completed_tasks,
      onTimeCompleted: item.on_time_completed_tasks,
      avgProgress: item.avg_progress,
      reported: item.reported_tasks,
    });

    return {
      month: item.month,
      total_tasks: Number(item.total_tasks || 0),
      completed_tasks: Number(item.completed_tasks || 0),
      overdue_tasks: Number(item.overdue_tasks || 0),
      avg_progress: score.avg_progress,
      kpi_score: score.total_score,
      level: score.level,
    };
  });

  // =========================
  // TOP USERS
  // =========================
  const topUsersResult = await pool.query(
    `
    WITH base AS (
      SELECT
        u.id AS user_id,
        COALESCE(u.full_name, u.username) AS full_name,
        COALESCE(un.name, 'Chưa xác định') AS unit_name,

        COUNT(DISTINCT t.id)::int AS total_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE s.trang_thai = 'hoan_thanh'
        )::int AS completed_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE s.trang_thai = 'hoan_thanh'
          AND (
            s.completed_at IS NULL
            OR s.han_chot IS NULL
            OR s.completed_at <= s.han_chot
          )
        )::int AS on_time_completed_tasks,

        COUNT(DISTINCT t.id) FILTER (
          WHERE s.han_chot < NOW()
            AND s.trang_thai <> 'hoan_thanh'
        )::int AS overdue_tasks,

        COALESCE(
          AVG(
            CASE
              WHEN s.trang_thai = 'cho_nhan_viec' THEN 0
              WHEN s.trang_thai = 'dang_thuc_hien' THEN 50
              WHEN s.trang_thai = 'yeu_cau_chinh_sua' THEN 60
              WHEN s.trang_thai = 'cho_duyet' THEN 80
              WHEN s.trang_thai = 'hoan_thanh' THEN 100
              ELSE 0
            END
          ),
          0
        )::numeric AS avg_progress,

        COUNT(DISTINCT t.id) FILTER (
          WHERE s.noi_dung_nop IS NOT NULL
             OR s.file_path IS NOT NULL
        )::int AS reported_tasks

      FROM subtasks s

      JOIN tasks t
        ON s.task_id = t.id

      JOIN users u
        ON s.assignee_user_id = u.id

      LEFT JOIN units un
        ON u.unit_id = un.id

      JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id

      ${whereClause}

      GROUP BY u.id, u.full_name, u.username, un.name
    )

    SELECT *
    FROM base
    ORDER BY full_name ASC
    `,
    values
  );

  const topUsers = topUsersResult.rows
    .map((item) => {
      const score = calculateKpiScore({
        total: item.total_tasks,
        completed: item.completed_tasks,
        onTimeCompleted: item.on_time_completed_tasks,
        avgProgress: item.avg_progress,
        reported: item.reported_tasks,
      });

      return {
        user_id: item.user_id,
        full_name: item.full_name,
        unit_name: item.unit_name,
        total_tasks: Number(item.total_tasks || 0),
        completed_tasks: Number(item.completed_tasks || 0),
        overdue_tasks: Number(item.overdue_tasks || 0),
        kpi_score: score.total_score,
        level: score.level,
      };
    })
    .sort((a, b) => b.kpi_score - a.kpi_score)
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

  // =========================
  // RISK UNITS
  // =========================
  const riskUnits = unitChart
    .map((item) => {
      const total = Number(item.total_tasks || 0);
      const overdue = Number(item.overdue_tasks || 0);
      const completed = Number(item.completed_tasks || 0);

      const overdueRate =
        total > 0 ? Math.round((overdue / total) * 100) : 0;

      let risk_level = "low";
      let risk_label = "Nguy cơ thấp";

      if (overdueRate >= 50) {
        risk_level = "high";
        risk_label = "Nguy cơ cao";
      } else if (overdueRate >= 25) {
        risk_level = "medium";
        risk_label = "Nguy cơ trung bình";
      }

      return {
        unit_name: item.unit_name,
        total_tasks: total,
        completed_tasks: completed,
        overdue_tasks: overdue,
        overdue_rate: overdueRate,
        risk_level,
        risk_label,
      };
    })
    .sort((a, b) => b.overdue_rate - a.overdue_rate)
    .slice(0, 10);

  // =========================
  // REPORT SUMMARY
  // =========================
  const reportResult = await pool.query(
    `
    SELECT
      (
        SELECT COUNT(*)::int
        FROM task_periodic_reports
      ) AS task_reports,

      (
        SELECT COUNT(*)::int
        FROM employee_periodic_reports
      ) AS employee_reports
    `
  );

  const reportSummary = reportResult.rows[0];

  return {
    summary: {
      ...summary,
      total_reports:
        Number(reportSummary.task_reports || 0) +
        Number(reportSummary.employee_reports || 0),
    },

    statusChart: statusResult.rows,
    unitChart,
    overdueTasks: overdueResult.rows,

    monthlyTrend,

    topDepartments: unitChart
      .map((item) => ({
        unit_name: item.unit_name,
        total_tasks: Number(item.total_tasks || 0),
        completed_tasks: Number(item.completed_tasks || 0),
        overdue_tasks: Number(item.overdue_tasks || 0),
        completion_rate: Number(item.completion_rate || 0),
      }))
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, 10),

    topUsers,
    riskUnits,

    reportSummary: {
      task_reports: Number(reportSummary.task_reports || 0),
      employee_reports: Number(reportSummary.employee_reports || 0),
    },
  };
};

exports.getTaskRiskAnalytics = async (user, query = {}) => {
  const values = [];

  const accessFilter = buildTaskAccessFilter(user, values);
  const dateFilter = buildDateFilter(query, values);

  const whereClause = `
    WHERE t.deleted_at IS NULL
      AND tt.code <> 'hoan_thanh'
      ${accessFilter}
      ${dateFilter}
  `;

  const result = await pool.query(
    `
    SELECT
      t.id AS task_id,
      t.tieu_de AS task_title,
      t.han_chot AS deadline,
      t.priority_level,
      t.priority_score,

      tt.code AS status_code,
      tt.name AS status_name,

      COALESCE(un.name, 'Chưa xác định') AS unit_name,

      CASE
        WHEN t.han_chot IS NULL THEN NULL
        ELSE DATE_PART('day', t.han_chot - NOW())::int
      END AS days_left,

      CASE
        WHEN t.han_chot IS NULL THEN 0
        WHEN t.han_chot < NOW()
        THEN GREATEST(DATE_PART('day', NOW() - t.han_chot), 0)::int
        ELSE 0
      END AS overdue_days,

      COALESCE(sub.total_subtasks, 0)::int AS total_subtasks,
      COALESCE(sub.done_subtasks, 0)::int AS done_subtasks,
      COALESCE(sub.pending_review_subtasks, 0)::int AS pending_review_subtasks,
      COALESCE(sub.revision_subtasks, 0)::int AS revision_subtasks,
      COALESCE(sub.unfinished_subtasks, 0)::int AS unfinished_subtasks,

      CASE
        WHEN COALESCE(sub.total_subtasks, 0) > 0
        THEN COALESCE(sub.avg_progress, 0)::int
        ELSE
          CASE tt.code
            WHEN 'hoan_thanh' THEN 100
            WHEN 'cho_duyet' THEN 80
            WHEN 'yeu_cau_chinh_sua' THEN 60
            WHEN 'dang_thuc_hien' THEN 50
            WHEN 'da_giao_nhiem_vu' THEN 25
            WHEN 'cho_xac_nhan_don_vi' THEN 10
            ELSE 0
          END
      END AS progress

    FROM tasks t

    JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN units un
      ON t.unit_id = un.id

    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'hoan_thanh'
        ) AS done_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'cho_duyet'
        ) AS pending_review_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai = 'yeu_cau_chinh_sua'
        ) AS revision_subtasks,

        COUNT(*) FILTER (
          WHERE s.trang_thai <> 'hoan_thanh'
        ) AS unfinished_subtasks,

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

    ${whereClause}

    ORDER BY t.han_chot ASC NULLS LAST, t.created_at DESC
    LIMIT 20
    `,
    values
  );

  const riskTasks = result.rows
    .map((task) => {
      const risk = calculateRisk(task);

      return {
        ...task,
        ...risk,
      };
    })
    .sort((a, b) => b.risk_score - a.risk_score);

  return {
    riskTasks,
  };
};