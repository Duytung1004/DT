const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

const employeeReportController =
  require("./employeeReportController");

const {
  decodeFileName,
  safeFileName,
} = require("../../utils/fileNameHelper");

// =======================
// UPLOAD EMPLOYEE REPORT FILE
// =======================
const uploadDir = path.join(
  __dirname,
  "../../../uploads/employee-reports"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const originalName = safeFileName(
      decodeFileName(file.originalname)
    );

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(originalName);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Chỉ cho phép upload PDF, Word, Excel, PNG, JPG"
        )
      );
    }
  },
});

// =======================
// DUE REPORTS
// Nhân viên xem tháng hiện tại cần báo cáo gì
// =======================
router.get(
  "/due",
  verifyToken,
  requirePermission("task:submit"),
  employeeReportController.getDueEmployeeReports
);

// =======================
// CREATE REPORT
// Nhân viên gửi 1 báo cáo tháng, gồm nhiều phần việc
// =======================
router.post(
  "/",
  verifyToken,
  requirePermission("task:submit"),
  upload.single("file"),
  employeeReportController.createEmployeeReport
);

// =======================
// GET REPORT LIST
// Nhân viên/trưởng phòng/lãnh đạo xem danh sách báo cáo
// =======================
router.get(
  "/",
  verifyToken,
  employeeReportController.getEmployeeReports
);

// =======================
// EXPORT EMPLOYEE REPORTS EXCEL
// =======================
router.get(
  "/export/excel",
  verifyToken,
  employeeReportController.exportEmployeeReportsExcel
);

// =======================
// GET REPORT DETAIL
// =======================
router.get(
  "/:id",
  verifyToken,
  employeeReportController.getEmployeeReportById
);

module.exports = router;