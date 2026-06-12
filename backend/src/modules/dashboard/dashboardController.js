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

exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const scope = req.query.scope || "leader";
    const currentUserId = getUserId(user);

    const canViewLeader =
      hasPermission(user, "dashboard:leader") ||
      hasPermission(user, "task:view_all");

    const canViewUnit =
      hasPermission(user, "dashboard:unit") ||
      hasPermission(user, "task:view_unit");

    const canViewOwn =
      hasPermission(user, "dashboard:own") ||
      hasPermission(user, "task:view_own");

    if (!["leader", "unit", "own"].includes(scope)) {
      return res.status(400).json({
        message: "Scope dashboard không hợp lệ",
      });
    }

    if (scope === "leader" && !canViewLeader) {
      return res.status(403).json({
        message: "Không có quyền xem dashboard tổng",
      });
    }

    if (scope === "unit" && !canViewUnit) {
      return res.status(403).json({
        message: "Không có quyền xem dashboard đơn vị",
      });
    }

    if (scope === "own" && !canViewOwn) {
      return res.status(403).json({
        message: "Không có quyền xem dashboard cá nhân",
      });
    }

    if (scope === "unit" && !user.unit_id) {
      return res.status(400).json({
        message: "Tài khoản chưa được gán phòng ban",
      });
    }

    // =======================
    // WHERE TASK
    // =======================
    const conditions = ["t.deleted_at IS NULL"];
    const params = [];

    if (scope === "unit") {
      params.push(user.unit_id);
      conditions.push(`t.unit_id = $${params.length}`);
    }

    if (scope === "own") {
      params.push(currentUserId);

      conditions.push(`
        (
          t.assignee_user_id = $${params.length}
          OR EXISTS (
            SELECT 1
            FROM subtasks s
            WHERE s.task_id = t.id
              AND s.assignee_user_id = $${params.length}
          )
        )
      `);
    }

    const whereClause = conditions.join(" AND ");

    // =======================
    // SUMMARY
    // =======================
    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE tt.code = 'hoan_thanh'
        )::int AS done,

        COUNT(*) FILTER (
          WHERE tt.code IN (
            'dang_thuc_hien',
            'cho_duyet',
            'cho_duyet_cap_1',
            'cho_duyet_cap_2',
            'da_giao_nhiem_vu',
            'cho_nhan_viec',
            'cho_xac_nhan_don_vi',
            'yeu_cau_chinh_sua'
          )
        )::int AS doing,

        COUNT(*) FILTER (
          WHERE t.han_chot::date < CURRENT_DATE
            AND tt.code <> 'hoan_thanh'
        )::int AS overdue

      FROM tasks t

      JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id

      WHERE ${whereClause}
      `,
      params
    );

    // =======================
    // BY DEPARTMENT
    // =======================
    const deptParams = [];
    const deptWhere = ["u.deleted_at IS NULL"];
    const deptTaskJoin = [
      "t.unit_id = u.id",
      "t.deleted_at IS NULL",
    ];

    if (scope === "unit") {
      deptParams.push(user.unit_id);
      deptWhere.push(`u.id = $${deptParams.length}`);
    }

    if (scope === "own") {
      deptParams.push(currentUserId);

      deptTaskJoin.push(`
        (
          t.assignee_user_id = $${deptParams.length}
          OR EXISTS (
            SELECT 1
            FROM subtasks s
            WHERE s.task_id = t.id
              AND s.assignee_user_id = $${deptParams.length}
          )
        )
      `);
    }

    const departmentResult = await pool.query(
      `
      SELECT
        u.id AS unit_id,
        u.name AS department,

        COUNT(t.id)::int AS total,

        COUNT(t.id) FILTER (
          WHERE tt.code = 'hoan_thanh'
        )::int AS done,

        COUNT(t.id) FILTER (
          WHERE tt.code IN (
            'dang_thuc_hien',
            'cho_duyet',
            'cho_duyet_cap_1',
            'cho_duyet_cap_2',
            'da_giao_nhiem_vu',
            'cho_nhan_viec',
            'cho_xac_nhan_don_vi',
            'yeu_cau_chinh_sua'
          )
        )::int AS doing,

        COUNT(t.id) FILTER (
          WHERE t.han_chot::date < CURRENT_DATE
            AND tt.code <> 'hoan_thanh'
        )::int AS overdue

      FROM units u

      LEFT JOIN tasks t
        ON ${deptTaskJoin.join(" AND ")}

      LEFT JOIN trang_thai_task tt
        ON t.trang_thai_id = tt.id

      WHERE ${deptWhere.join(" AND ")}

      GROUP BY u.id, u.name
      ORDER BY u.name ASC
      `,
      deptParams
    );

    // =======================
    // TIMELINE 7 NGÀY GẦN NHẤT
    // =======================
    const timelineResult = await pool.query(
      `
      SELECT *
      FROM (
        SELECT
          TO_CHAR(DATE(t.created_at), 'DD/MM') AS day,
          DATE(t.created_at) AS date,

          COUNT(*)::int AS total,

          COUNT(*) FILTER (
            WHERE tt.code = 'hoan_thanh'
          )::int AS done,

          COUNT(*) FILTER (
            WHERE t.han_chot::date < CURRENT_DATE
              AND tt.code <> 'hoan_thanh'
          )::int AS overdue

        FROM tasks t

        JOIN trang_thai_task tt
          ON t.trang_thai_id = tt.id

        WHERE ${whereClause}

        GROUP BY DATE(t.created_at)
        ORDER BY DATE(t.created_at) DESC
        LIMIT 7
      ) x
      ORDER BY x.date ASC
      `,
      params
    );

    res.json({
      scope,
      summary: summaryResult.rows[0] || {
        total: 0,
        done: 0,
        doing: 0,
        overdue: 0,
      },
      departments: departmentResult.rows || [],
      timeline: timelineResult.rows || [],
    });
  } catch (err) {
    console.error("LỖI DASHBOARD:", err);

    res.status(500).json({
      message: "Lỗi server khi lấy dữ liệu dashboard",
      error: err.message,
    });
  }
};