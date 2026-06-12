const employeeReportService = require("./employeeReportService");

// =======================
// GET DUE EMPLOYEE REPORTS
// Nhân viên xem các phần việc cần báo cáo trong tháng hiện tại
// =======================
exports.getDueEmployeeReports = async (req, res) => {
  try {
    const result =
      await employeeReportService.getDueEmployeeReports(
        req.user,
        req.query
      );

    res.json(result);
  } catch (err) {
    console.log(
      "GET DUE EMPLOYEE REPORTS ERROR:",
      err
    );

    res.status(400).json({
      message:
        err.message ||
        "Không thể lấy danh sách phần việc cần báo cáo",
    });
  }
};

// =======================
// CREATE EMPLOYEE REPORT
// // Nhân viên gửi báo cáo tổng hợp hằng tháng
// =======================
exports.createEmployeeReport = async (req, res) => {
  try {
    const result =
      await employeeReportService.createEmployeeReport(
        req.body,
        req.file,
        req.user
      );

    res.json(result);
  } catch (err) {
    console.log(
      "CREATE EMPLOYEE REPORT ERROR:",
      err
    );

    res.status(400).json({
      message:
        err.message ||
        "Không thể gửi báo cáo cá nhân",
    });
  }
};

// =======================
// GET EMPLOYEE REPORTS
// Nhân viên xem báo cáo của mình
// Trưởng phòng xem báo cáo trong đơn vị
// Lãnh đạo xem tất cả
// =======================
exports.getEmployeeReports = async (req, res) => {
  try {
    const result =
      await employeeReportService.getEmployeeReports(
        req.user,
        req.query
      );

    res.json(result);
  } catch (err) {
    console.log(
      "GET EMPLOYEE REPORTS ERROR:",
      err
    );

    res.status(400).json({
      message:
        err.message ||
        "Không thể lấy danh sách báo cáo cá nhân",
    });
  }
};

// =======================
// GET EMPLOYEE REPORT DETAIL
// =======================
exports.getEmployeeReportById = async (req, res) => {
  try {
    const result =
      await employeeReportService.getEmployeeReportById(
        req.params.id,
        req.user
      );

    res.json(result);
  } catch (err) {
    console.log(
      "GET EMPLOYEE REPORT DETAIL ERROR:",
      err
    );

    res.status(400).json({
      message:
        err.message ||
        "Không thể lấy chi tiết báo cáo",
    });
  }
};
// =======================
// EXPORT EMPLOYEE REPORTS EXCEL
// =======================
exports.exportEmployeeReportsExcel = async (req, res) => {
  try {
    const buffer =
      await employeeReportService.exportEmployeeReportsExcel(
        req.user,
        req.query
      );

    const fileName = `bao-cao-ca-nhan-${Date.now()}.xlsx`;

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
    console.log(
      "EXPORT EMPLOYEE REPORTS EXCEL ERROR:",
      err
    );

    res.status(400).json({
      message:
        err.message ||
        "Không thể xuất file báo cáo cá nhân Excel",
    });
  }
};