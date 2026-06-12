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

const taskReportController = require("./taskReportController");

const {
  decodeFileName,
  safeFileName,
} = require("../../utils/fileNameHelper");

// =======================
// UPLOAD TASK REPORT FILE
// =======================
const uploadDir = path.join(
  __dirname,
  "../../../uploads/task-reports"
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
// GET ALL REPORTS
// Trang Reports ở sidebar
// =======================
router.get(
  "/",
  verifyToken,
  taskReportController.getAllReports
);

// =======================
// GET DUE REPORTS
// Danh sách nhiệm vụ cần báo cáo tháng
// =======================
router.get(
  "/due",
  verifyToken,
  taskReportController.getDueReports
);

// =======================
// MONTHLY UNIT REPORT DUE
// Trưởng phòng/lãnh đạo xem nhiệm vụ cần tổng hợp báo cáo tháng
// =======================
router.get(
  "/monthly/due",
  verifyToken,
  taskReportController.getMonthlyDueReport
);

// =======================
// CREATE MONTHLY UNIT REPORT
// Trưởng phòng gửi 1 báo cáo tháng của phòng
// =======================
router.post(
  "/monthly",
  verifyToken,
  requirePermission("approve_level_1"),
  upload.single("file"),
  taskReportController.createMonthlyUnitReport
);

// =======================
// GET MONTHLY UNIT REPORT DETAIL
// =======================
router.get(
  "/monthly/:id",
  verifyToken,
  taskReportController.getMonthlyUnitReportById
);

// =======================
// EXPORT ALL REPORTS TO EXCEL
// =======================
router.get(
  "/export/excel",
  verifyToken,
  taskReportController.exportReportsExcel
);

// =======================
// CREATE TASK REPORT
// Trưởng phòng gửi báo cáo tháng cho nhiệm vụ
// =======================
router.post(
  "/:id",
  verifyToken,
  requirePermission("approve_level_1"),
  upload.single("file"),
  taskReportController.createTaskReport
);

// =======================
// GET TASK REPORTS BY TASK
// Xem báo cáo tháng của một nhiệm vụ
// =======================
router.get(
  "/:id",
  verifyToken,
  taskReportController.getTaskReports
);

module.exports = router;