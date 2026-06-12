const express = require("express");
const router = express.Router();

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

const controller = require("./taskStatusController");

router.get(
  "/",
  verifyToken,
  requirePermission("status:view"),
  controller.getTaskStatuses
);

router.put(
  "/:id",
  verifyToken,
  requirePermission("status:update"),
  controller.updateTaskStatus
);

module.exports = router;