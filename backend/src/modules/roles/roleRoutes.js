const express = require("express");
const router = express.Router();

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

const roleController = require("./roleController");

// Lấy danh sách vai trò
router.get(
  "/",
  verifyToken,
  roleController.getRoles
);

// Lấy quyền của một vai trò
router.get(
  "/:id/permissions",
  verifyToken,
  requirePermission("role:view"),
  roleController.getRolePermissions
);

// Cập nhật quyền cho vai trò
router.put(
  "/:id/permissions",
  verifyToken,
  requirePermission("role:update_permissions"),
  roleController.updateRolePermissions
);

module.exports = router;