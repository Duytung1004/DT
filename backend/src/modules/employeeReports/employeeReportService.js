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
// =======================
// PROGRESS BY SUBTASK STATUS
// =======================
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

const pad2 = (value) =>
  String(value).padStart(2, "0");

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
// GET EMPLOYEE DUE REPORT
// Nhân viên xem danh sách phần việc cần báo cáo trong tháng hiện tại
// =======================
exports.getDueEmployeeReports = async (user, filters = {}) => {
  const currentUserId = Number(
    user.userId || user.id
  );

  if (!user.permissions.includes("task:submit")) {
    throw new Error(
      "Không có quyền xem báo cáo cá nhân"
    );
  }

  const period = getCurrentPeriod(filters.period_key);
  const now = new Date();

  const canSubmit =
  now >= period.report_open_at &&
  now <= period.due_at;

  const check = await pool.query(
  `
  SELECT id
  FROM employee_periodic_reports
  WHERE reporter_id = $1
    AND period_key = $2
  LIMIT 1
  `,
  [
    currentUserId,
    period.period_key,
  ]
);

  const result = await pool.query(
  `
  SELECT
    s.id AS subtask_id,
    s.task_id,
    s.tieu_de AS subtask_title,
    s.mo_ta AS subtask_description,
    s.trang_thai AS subtask_status,
    s.han_chot AS subtask_deadline,
    s.created_at AS subtask_created_at,
    s.submitted_at,
    s.completed_at,

    t.tieu_de AS task_title,
    t.unit_id,
    un.name AS unit_name

  FROM subtasks s

  JOIN tasks t
    ON s.task_id = t.id

  LEFT JOIN units un
    ON t.unit_id = un.id

  WHERE s.assignee_user_id = $1
    AND t.deleted_at IS NULL

    -- Phần việc đã phát sinh trước hoặc trong tháng báo cáo
    AND s.created_at <= $3

    -- Chưa hoàn thành, hoặc hoàn thành trong chính tháng báo cáo
    AND (
      s.completed_at IS NULL
      OR s.completed_at >= $2
    )

  ORDER BY s.han_chot ASC
  `,
  [
    currentUserId,
    period.period_start,
    period.period_end,
  ]
);

  return [
  {
    chu_ky_bao_cao: "hang_thang",
    period_key: period.period_key,
    period_start: period.period_start,
    period_end: period.period_end,
    report_open_at: period.report_open_at,
    due_at: period.due_at,
    can_submit: canSubmit,
    is_reported: check.rows.length > 0,
    report_id: check.rows[0]?.id || null,
    items: result.rows.map((item) => ({
      ...item,
      progress_snapshot: getSubtaskProgress(item.subtask_status),
    })),
  },
];
};

// =======================
// CREATE EMPLOYEE PERIODIC REPORT
// Nhân viên gửi 1 báo cáo kỳ, gắn nhiều subtask
// =======================
exports.createEmployeeReport = async (
  data,
  file,
  user
) => {
  const currentUserId = Number(
    user.userId || user.id
  );

  if (!user.permissions.includes("task:submit")) {
    throw new Error(
      "Không có quyền gửi báo cáo cá nhân"
    );
  }
  const {
    noi_dung,
    kho_khan,
    de_xuat,
  } = data;

  const subtaskIds = normalizeArray(
    data.subtask_ids
  );

  const itemNotes = normalizeObject(
    data.item_notes
  );

  if (!noi_dung || !noi_dung.trim()) {
    throw new Error("Vui lòng nhập nội dung báo cáo");
  }

  const period = getCurrentPeriod();
  const now = new Date();

    if (now < period.report_open_at) {
    throw new Error(
        `Chưa đến thời gian nộp báo cáo. Có thể nộp từ ngày ${period.report_open_at.toLocaleDateString("vi-VN")}`
    );
    }

  if (!period.period_key) {
    throw new Error("Kỳ báo cáo không hợp lệ");
  }

  const exists = await pool.query(
    `
    SELECT id
    FROM employee_periodic_reports
    WHERE reporter_id = $1
      AND period_key = $2
    LIMIT 1
    `,
    [
      currentUserId,
      period.period_key,
    ]
  );

  if (exists.rows.length > 0) {
    throw new Error(
      "Bạn đã gửi báo cáo cho tháng này"
    );
  }

  let values = [
  currentUserId,
  period.period_start,
  period.period_end,
];

  let subtaskFilter = "";

  if (subtaskIds.length > 0) {
    values.push(subtaskIds);

    subtaskFilter = `
      AND s.id = ANY($${values.length})
    `;
  }

  const subtaskResult = await pool.query(
  `
  SELECT
    s.id AS subtask_id,
    s.task_id,
    s.tieu_de AS subtask_title,
    s.trang_thai AS subtask_status,
    s.han_chot AS subtask_deadline,
    s.created_at AS subtask_created_at,
    s.submitted_at,
    s.completed_at,

    t.unit_id,
    t.tieu_de AS task_title

  FROM subtasks s

  JOIN tasks t
    ON s.task_id = t.id

  WHERE s.assignee_user_id = $1
    AND t.deleted_at IS NULL

    -- Phần việc phát sinh trước hoặc trong tháng báo cáo
    AND s.created_at <= $3

    -- Chưa hoàn thành, hoặc hoàn thành trong tháng báo cáo
    AND (
      s.completed_at IS NULL
      OR s.completed_at >= $2
    )

    ${subtaskFilter}

  ORDER BY s.han_chot ASC
  `,
  values
);

  if (subtaskResult.rows.length === 0) {
    throw new Error(
      "Không có phần việc phù hợp để báo cáo"
    );
  }

  const subtasks = subtaskResult.rows;

  const unitId = subtasks[0].unit_id;

  const totalSubtasks = subtasks.length;

  const doneCount = subtasks.filter(
    (s) => s.subtask_status === "hoan_thanh"
  ).length;

  const doingCount = subtasks.filter(
    (s) => s.subtask_status === "dang_thuc_hien"
  ).length;

  const pendingReviewCount = subtasks.filter(
    (s) => s.subtask_status === "cho_duyet"
  ).length;

  const overdueCount = subtasks.filter((s) => {
    if (!s.subtask_deadline) return false;

    return (
      new Date(s.subtask_deadline) < new Date() &&
      s.subtask_status !== "hoan_thanh"
    );
  }).length;

  const totalProgress = subtasks.reduce(
    (sum, item) =>
      sum +
      getSubtaskProgress(item.subtask_status),
    0
  );

  const progress = Math.round(
    totalProgress / totalSubtasks
  );

  const fileName = file
    ? safeFileName(
        decodeFileName(file.originalname)
      )
    : null;

  const filePath = file
  ? `/uploads/employee-reports/${file.filename}`
  : null;

  const fileType = file ? file.mimetype : null;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reportResult = await client.query(
      `
      INSERT INTO employee_periodic_reports
      (
        unit_id,
        reporter_id,
        period_key,
        period_start,
        period_end,
        han_bao_cao,
        noi_dung,
        kho_khan,
        de_xuat,
        tong_phan_viec,
        so_hoan_thanh,
        so_dang_thuc_hien,
        so_cho_duyet,
        so_qua_han,
        ti_le_hoan_thanh,
        file_name,
        file_path,
        file_type,
        report_status
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
      `,
      [
        unitId,
        currentUserId,
        period.period_key,
        period.period_start,
        period.period_end,
        period.due_at,
        noi_dung,
        kho_khan || null,
        de_xuat || null,
        totalSubtasks,
        doneCount,
        doingCount,
        pendingReviewCount,
        overdueCount,
        progress,
        fileName,
        filePath,
        fileType,
        "submitted",
      ]
    );

    const report = reportResult.rows[0];

    for (const item of subtasks) {
      const note =
        itemNotes[item.subtask_id] ||
        itemNotes[String(item.subtask_id)] ||
        null;

      await client.query(
        `
        INSERT INTO employee_periodic_report_items
        (
          report_id,
          task_id,
          subtask_id,
          subtask_title,
          subtask_status,
          progress_snapshot,
          note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          report.id,
          item.task_id,
          item.subtask_id,
          item.subtask_title,
          item.subtask_status,
          getSubtaskProgress(
            item.subtask_status
          ),
          note,
        ]
      );
    }

    await client.query("COMMIT");

    const unitLeaders = await pool.query(
      `
      SELECT u.id
      FROM users u

      JOIN role_permissions rp
        ON rp.role_id = u.role_id

      WHERE u.unit_id = $1
        AND rp.permission = 'approve_level_1'
      `,
      [unitId]
    );

    await Promise.all(
      unitLeaders.rows.map((leader) =>
        createNotification({
          userId: leader.id,
          type: "report_employee_submitted",
          title:
            "Có báo cáo định kỳ của nhân viên",
          content: `Kỳ báo cáo: ${period.period_key}`,
        })
      )
    );

    await createLog(
  subtasks[0].task_id,
  currentUserId,
  `Gửi báo cáo cá nhân kỳ ${period.period_key}`
);

emitReportChanged("created", report.id, {
  reportType: "employee_report",
  periodKey: period.period_key,
  unitId,
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
// GET EMPLOYEE REPORTS
// Nhân viên xem của mình, trưởng phòng xem trong đơn vị
// =======================
exports.getEmployeeReports = async (user, filters = {}) => {
  const currentUserId = Number(
    user.userId || user.id
  );

  let query = `
    SELECT
      r.*,
      u.full_name AS reporter_name,
      u.username AS reporter_username,
      un.name AS unit_name
    FROM employee_periodic_reports r

    LEFT JOIN users u
      ON r.reporter_id = u.id

    LEFT JOIN units un
      ON r.unit_id = un.id

    WHERE 1 = 1
  `;

  const values = [];
  if (filters.period_key) {
  values.push(filters.period_key);

  query += `
    AND r.period_key = $${values.length}
  `;
}

  if (user.permissions.includes("task:view_all")) {
    // lãnh đạo/admin xem tất cả
  } else if (
    user.permissions.includes("task:view_unit") &&
    user.unit_id
  ) {
    values.push(user.unit_id);

    query += `
      AND r.unit_id = $${values.length}
    `;
  } else {
    values.push(currentUserId);

    query += `
      AND r.reporter_id = $${values.length}
    `;
  }

  query += `
    ORDER BY r.created_at DESC
  `;

  const result = await pool.query(
    query,
    values
  );

  return result.rows;
};

// =======================
// GET EMPLOYEE REPORT DETAIL
// =======================
exports.getEmployeeReportById = async (
  reportId,
  user
) => {
  const currentUserId = Number(
    user.userId || user.id
  );

  const reportResult = await pool.query(
    `
    SELECT
      r.*,
      u.full_name AS reporter_name,
      u.username AS reporter_username,
      un.name AS unit_name
    FROM employee_periodic_reports r

    LEFT JOIN users u
      ON r.reporter_id = u.id

    LEFT JOIN units un
      ON r.unit_id = un.id

    WHERE r.id = $1
    `,
    [reportId]
  );

  if (reportResult.rows.length === 0) {
    throw new Error("Báo cáo không tồn tại");
  }

  const report = reportResult.rows[0];

  const canView =
    user.permissions.includes("task:view_all") ||
    (
      user.permissions.includes("task:view_unit") &&
      Number(report.unit_id) === Number(user.unit_id)
    ) ||
    Number(report.reporter_id) === currentUserId;

  if (!canView) {
    throw new Error("Không có quyền xem báo cáo này");
  }

  const itemsResult = await pool.query(
    `
    SELECT
      i.*,
      t.tieu_de AS task_title
    FROM employee_periodic_report_items i

    LEFT JOIN tasks t
      ON i.task_id = t.id

    WHERE i.report_id = $1

    ORDER BY i.created_at ASC
    `,
    [reportId]
  );

  return {
    ...report,
    items: itemsResult.rows,
  };
};
// =======================
// EXPORT EMPLOYEE REPORTS TO EXCEL
// Xuất danh sách báo cáo cá nhân
// =======================
exports.exportEmployeeReportsExcel = async (user, filters = {}) => {
  const reports = await exports.getEmployeeReports(user, filters);

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Hệ thống quản lý tiến độ nhiệm vụ";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Báo cáo cá nhân");

  const columns = [
    { header: "STT", width: 10 },
    { header: "Kỳ báo cáo", width: 16 },
    { header: "Người báo cáo", width: 28 },
    { header: "Phòng ban", width: 28 },
    { header: "Tổng phần việc", width: 18 },
    { header: "Hoàn thành", width: 16 },
    { header: "Đang thực hiện", width: 18 },
    { header: "Chờ duyệt", width: 16 },
    { header: "Quá hạn", width: 14 },
    { header: "Tỉ lệ hoàn thành", width: 18 },
    { header: "Nội dung", width: 50 },
    { header: "Khó khăn", width: 40 },
    { header: "Đề xuất", width: 40 },
    { header: "Ngày gửi", width: 24 },
  ];

  // =======================
  // TITLE
  // =======================
  worksheet.mergeCells("A1:N1");

  const titleCell = worksheet.getCell("A1");

  titleCell.value = "BÁO CÁO CÁ NHÂN CÁN BỘ THEO THÁNG";

  titleCell.font = {
    bold: true,
    size: 16,
  };

  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(1).height = 30;

  worksheet.mergeCells("A2:N2");

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
      fgColor: { argb: "FF7C3AED" },
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
    const row = worksheet.getRow(index + 5);

    const rowValues = [
      index + 1,
      item.period_key || "",
      item.reporter_name || item.reporter_username || "",
      item.unit_name || "",
      Number(item.tong_phan_viec || 0),
      Number(item.so_hoan_thanh || 0),
      Number(item.so_dang_thuc_hien || 0),
      Number(item.so_cho_duyet || 0),
      Number(item.so_qua_han || 0),
      item.ti_le_hoan_thanh != null
        ? `${item.ti_le_hoan_thanh}%`
        : "0%",
      item.noi_dung || "",
      item.kho_khan || "",
      item.de_xuat || "",
      item.created_at
        ? new Date(item.created_at).toLocaleString("vi-VN")
        : "",
    ];

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
    worksheet.mergeCells("A5:N5");

    const emptyCell = worksheet.getCell("A5");

    emptyCell.value = "Không có dữ liệu báo cáo cá nhân";

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
    to: "N4",
  };

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 4,
    },
  ];

  return workbook.xlsx.writeBuffer();
};