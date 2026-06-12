const express = require("express");
const router = express.Router();

const userController = require("./userController");
const { verifyToken } = require("../../middleware/authMiddleware");
const { requirePermission } = require("../../middleware/rbacMiddleware");

// CREATE
router.post(
  "/",
  verifyToken,
  requirePermission("user:create"),
  userController.createUser
);

// GET ALL
router.get(
  "/",
  verifyToken,
  requirePermission("user:view"),
  userController.getUsers
);

router.get(
  "/unit/:unitId",
  verifyToken,
  userController.getUsersByUnit
);

// UPDATE
router.put(
  "/:id",
  verifyToken,
  requirePermission("user:update"),
  userController.updateUser
);

// DELETE
router.delete(
  "/:id",
  verifyToken,
  requirePermission("user:delete"),
  userController.deleteUser
);

// RESET PASSWORD
router.patch(
  "/:id/reset-password",
  verifyToken,
  requirePermission("user:reset_password"),
  userController.resetPassword
);

router.patch(
  "/:id/unlock",
  verifyToken,
  requirePermission("user:unlock"),
  userController.unlockUser
);

module.exports = router;