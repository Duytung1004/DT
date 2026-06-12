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

const taskController = require("./taskController");


const {
  decodeFileName,
  safeFileName,
} = require("../../utils/fileNameHelper");

// =======================
// UPLOAD TASK SUBMISSION FILE
// =======================
const submissionUploadDir = path.join(
  __dirname,
  "../../../uploads/task-submissions"
);

if (!fs.existsSync(submissionUploadDir)) {
  fs.mkdirSync(submissionUploadDir, {
    recursive: true,
  });
}

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, submissionUploadDir);
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

const submissionUpload = multer({
  storage: submissionStorage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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
// CREATE TASK
// =======================
router.post(
  "/",
  verifyToken,
  requirePermission("task:create"),
  taskController.createTask
);

// =======================
// CREATE MULTIPLE TASKS FROM DOCUMENT
// =======================
router.post(
  "/bulk-from-document",
  verifyToken,
  requirePermission("task:create"),
  taskController.createTasksFromDocument
);

// =======================
// GET ALL TASKS
// =======================
router.get(
  "/",
  verifyToken,
  taskController.getTasks
);

// =======================
// GET TASKS BY UNIT
// =======================
router.get(
  "/by-unit",
  verifyToken,
  taskController.getTasksByUnit
);

// =======================
// GET ONE TASK
// =======================
router.get(
  "/:id",
  verifyToken,
  taskController.getTaskById
);

// =======================
// UPDATE TASK
// =======================
router.put(
  "/:id",
  verifyToken,
  requirePermission("task:update"),
  taskController.updateTask
);

// =======================
// DELETE TASK
// =======================
router.delete(
  "/:id",
  verifyToken,
  requirePermission("task:delete"),
  taskController.deleteTask
);

// =======================
// ASSIGN TASK DIRECTLY
// Giao trực tiếp task chính cho 1 cán bộ
// Có thể giữ tạm, sau này nếu dùng subtask thì ít dùng hơn
// =======================
router.post(
  "/:id/assign",
  verifyToken,
  requirePermission("task:assign"),
  taskController.assignTask
);



// =======================
// CONFIRM UNIT TASK
// Trưởng phòng xác nhận tiếp nhận nhiệm vụ chính
// =======================
router.put(
  "/:id/confirm-unit",
  verifyToken,
  requirePermission("approve_level_1"),
  taskController.confirmUnitTask
);

// =======================
// CONFIRM ASSIGNED TASK
// Luồng cũ: nhân viên xác nhận bắt đầu task chính
// Tạm giữ để không vỡ chức năng cũ
// =======================
router.put(
  "/:id/confirm-assigned",
  verifyToken,
  requirePermission("task:submit"),
  taskController.confirmAssignedTask
);

// =======================
// CREATE SUBTASK
// Trưởng phòng phân công nội bộ
// =======================
router.post(
  "/:id/subtask",
  verifyToken,
  requirePermission("subtask:create"),
  taskController.createSubtask
);

// =======================
// GET TASK SUBTASKS
// Lấy danh sách phần việc nội bộ của task
// =======================
router.get(
  "/:id/subtasks",
  verifyToken,
  taskController.getTaskSubtasks
);

// =======================
// UPDATE SUBTASK
// Trưởng phòng sửa phần việc nội bộ
// =======================
router.put(
  "/:id/subtasks/:subtaskId",
  verifyToken,
  requirePermission("subtask:create"),
  taskController.updateSubtask
);

router.put(
  "/:id/subtasks/:subtaskId/request-revision",
  verifyToken,
  requirePermission("approve_level_1"),
  taskController.requestSubtaskRevision
);
// =======================
// START SUBTASK
// Nhân viên bắt đầu thực hiện phần việc con
// =======================
router.put(
  "/:id/subtasks/:subtaskId/start",
  verifyToken,
  requirePermission("task:submit"),
  taskController.startSubtask
);

// =======================
// SUBMIT SUBTASK
// Nhân viên nộp phần việc con + file minh chứng
// =======================
router.post(
  "/:id/subtasks/:subtaskId/submit",
  verifyToken,
  requirePermission("task:submit"),
  submissionUpload.single("file"),
  taskController.submitSubtask
);


router.put(
  "/:taskId/subtasks/:subtaskId/approve",
  verifyToken,
  requirePermission("approve_level_1"),
  taskController.approveSubtask
);



router.put(
  "/:id/send-to-leader",
  verifyToken,
  requirePermission("approve_level_1"),
  taskController.sendTaskToLeaderApproval
);
// =======================
// UPDATE PROGRESS
// Luồng cũ của task chính
// Tạm giữ lại, sau này có thể bỏ nếu chuyển hẳn sang subtask
// =======================
router.post(
  "/:id/progress",
  verifyToken,
  requirePermission("task:update"),
  taskController.updateProgress
);

// =======================
// SUBMIT TASK
// Luồng cũ của task chính
// Tạm giữ lại, sau này có thể bỏ nếu chuyển hẳn sang subtask
// =======================
router.post(
  "/:id/submit",
  verifyToken,
  requirePermission("task:submit"),
  submissionUpload.single("file"),
  taskController.submitTask
);
// =======================
// APPROVE TASK
// =======================
router.post(
  "/:id/approve",
  verifyToken,
  requirePermission("task:approve"),
  taskController.approveTask
);

// =======================
// GET TASK LOGS
// =======================
router.get(
  "/:id/logs",
  verifyToken,
  taskController.getTaskLogs
);

// =======================
// GET TASK SUBMISSIONS
// =======================
router.get(
  "/:id/submissions",
  verifyToken,
  taskController.getTaskSubmissions
);


module.exports = router;