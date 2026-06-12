const express = require("express");
const router = express.Router();

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

const controller = require("./securityController");

router.get(
  "/logs",
  verifyToken,
  requirePermission("security:view_logs"),
  controller.getSecurityLogs
);

module.exports = router;