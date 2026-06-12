const express = require("express");
const router = express.Router();

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

const controller = require("./systemSettingsController");

// GET public: Login + Sidebar được phép lấy thông tin hệ thống
router.get(
  "/",
  controller.getSettings
);

// UPDATE: chỉ admin có quyền mới được sửa
router.put(
  "/",
  verifyToken,
  requirePermission("settings:update"),
  controller.updateSettings
);

module.exports = router;