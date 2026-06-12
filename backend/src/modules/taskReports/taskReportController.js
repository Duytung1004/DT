const taskReportService = require("./taskReportService");

// =======================
// CREATE TASK REPORT
// Trưởng phòng gửi báo cáo nhiệm vụ
// =======================
exports.createTaskReport = async (req, res) => {
  try {
    const result = await taskReportService.createTaskReport(
      req.params.id,
      req.body,
      req.file,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("CREATE TASK REPORT ERROR:", err);

    res.status(400).json({
      message: err.message || "Không thể gửi báo cáo nhiệm vụ",
    });
  }
};

// =======================
// GET TASK REPORTS
// Lấy báo cáo của một nhiệm vụ
// =======================
exports.getTaskReports = async (req, res) => {
  try {
    const result = await taskReportService.getTaskReports(
      req.params.id,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("GET TASK REPORTS ERROR:", err);

    res.status(400).json({
      message: err.message || "Không thể lấy báo cáo nhiệm vụ",
    });
  }
};


// =======================
// GET ALL REPORTS
// Trang Reports tổng hợp ở sidebar
// =======================
exports.getAllReports = async (req, res) => {
  try {
    const result = await taskReportService.getAllReports(
  req.user,
  req.query
);

    res.json(result);
  } catch (err) {
    console.log("GET ALL REPORTS ERROR:", err);

    res.status(400).json({
      message:
        err.message || "Không thể lấy danh sách báo cáo",
    });
  }
};
exports.getDueReports = async (req, res) => {
  try {
    const result = await taskReportService.getDueReports(
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("GET DUE REPORTS ERROR:", err);

    res.status(400).json({
      message:
        err.message || "Không thể lấy danh sách nhắc báo cáo",
    });
  }
};
// =======================
// GET MONTHLY DUE REPORT
// Danh sách nhiệm vụ cần tổng hợp vào báo cáo tháng
// =======================
exports.getMonthlyDueReport = async (req, res) => {
  try {
    const result = await taskReportService.getMonthlyDueReport(
  req.user,
  req.query
);

    res.json(result);
  } catch (err) {
    console.log("GET MONTHLY DUE REPORT ERROR:", err);

    res.status(400).json({
      message:
        err.message ||
        "Không thể lấy dữ liệu báo cáo tháng của phòng",
    });
  }
};

// =======================
// CREATE MONTHLY UNIT REPORT
// Trưởng phòng gửi 1 báo cáo tháng của phòng
// =======================
exports.createMonthlyUnitReport = async (req, res) => {
  try {
    const result =
      await taskReportService.createMonthlyUnitReport(
        req.body,
        req.file,
        req.user
      );

    res.json(result);
  } catch (err) {
    console.log("CREATE MONTHLY UNIT REPORT ERROR:", err);

    res.status(400).json({
      message:
        err.message ||
        "Không thể gửi báo cáo tháng của phòng",
    });
  }
};

// =======================
// GET MONTHLY UNIT REPORT DETAIL
// =======================
exports.getMonthlyUnitReportById = async (req, res) => {
  try {
    const result =
      await taskReportService.getMonthlyUnitReportById(
        req.params.id,
        req.user
      );

    res.json(result);
  } catch (err) {
    console.log("GET MONTHLY UNIT REPORT DETAIL ERROR:", err);

    res.status(400).json({
      message:
        err.message ||
        "Không thể xem chi tiết báo cáo tháng của phòng",
    });
  }
};
// =======================
// EXPORT REPORTS EXCEL
// =======================
exports.exportReportsExcel = async (req, res) => {
  try {
    const buffer =
      await taskReportService.exportReportsExcel(
        req.user,
        req.query
      );

    const fileName = `bao-cao-tong-hop-${Date.now()}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    res.send(buffer);
  } catch (err) {
    console.log("EXPORT REPORTS EXCEL ERROR:", err);

    res.status(400).json({
      message:
        err.message || "Không thể xuất file báo cáo Excel",
    });
  }
};