const express = require("express");
const router = express.Router();

const auditLogController = require("./auditLogController");

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

router.get(
  "/",
  verifyToken,
  requirePermission("audit:view"),
  auditLogController.getAuditLogs
);

module.exports = router;