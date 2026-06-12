const express = require("express");
const router = express.Router();

const notificationController = require("./notificationController");
const { verifyToken } = require("../../middleware/authMiddleware");

// GET ALL
router.get(
  "/",
  verifyToken,
  notificationController.getNotifications
);

// UNREAD COUNT
router.get(
  "/unread-count",
  verifyToken,
  notificationController.getUnreadCount
);

// MARK ALL
router.patch(
  "/read-all",
  verifyToken,
  notificationController.markAllAsRead
);

// MARK 1
router.patch(
  "/:id/read",
  verifyToken,
  notificationController.markAsRead
);

module.exports = router;