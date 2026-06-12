const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/authRoutes");
const taskRoutes = require("../modules/tasks/taskRoutes");
const notificationRoutes = require("../modules/notifications/notificationRoutes");
const taskReportRoutes = require("../modules/taskReports/taskReportRoutes");
const employeeReportRoutes = require("../modules/employeeReports/employeeReportRoutes");
const userRoutes = require("../modules/users/userRoutes");
const chatRoutes = require("../modules/chat/chatRoutes"); 
const dashboardRoutes = require("../modules/dashboard/dashboardRoutes"); 
const unitRoutes = require("../modules/unit/unitRoutes"); 
const documentRoutes = require("../modules/documents/documentRoutes"); 
const roleRoutes = require("../modules/roles/roleRoutes");
const taskStatusRoutes = require("../modules/taskStatus/taskStatusRoutes");
const systemSettingsRoutes = require("../modules/systemSettings/systemSettingsRoutes");
const securityRoutes = require("../modules/security/securityRoutes");
const analyticsRoutes = require("../modules/analytics/analyticsRoutes");
const trashRoutes = require("../modules/trash/trashRoutes");
const auditLogRoutes = require("../modules/auditLogs/auditLogRoutes");
const kpiRoutes = require("../modules/kpi/kpiRoutes");
const floatingTodoRoutes = require("../modules/floatingTodo/floatingTodoRoutes");
router.use("/users", userRoutes);
router.use("/units", unitRoutes);
router.use("/roles", roleRoutes);
router.use("/task-statuses", taskStatusRoutes);
router.use("/ai", require("../routes/aiRoutes"));
router.use("/auth", authRoutes);
router.use("/tasks", taskRoutes);
router.use("/task-reports", taskReportRoutes);
router.use("/employee-reports", employeeReportRoutes);
router.use("/system-settings", systemSettingsRoutes);
router.use("/security", securityRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/trash", trashRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/kpi", kpiRoutes);
router.use("/todos/floating", floatingTodoRoutes);
router.use(
  "/documents",
  documentRoutes
);

router.use("/files", require("./fileRoutes"));
router.use("/notifications", notificationRoutes);
router.use("/conversations", require("../modules/conversations/conversationRoutes"));
router.use("/chat", chatRoutes); 
router.use("/dashboard", dashboardRoutes);

module.exports = router;