const express = require("express");
const router = express.Router();

const authController = require("./authController");

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

// =========================
// PUBLIC ROUTES
// =========================
router.post(
  "/login",
  authController.login
);

router.post(
  "/register",
  authController.register
);

// =========================
// PROTECTED ROUTES
// =========================
router.get(
  "/me",
  verifyToken,
  authController.me
);

router.patch(
  "/profile",
  verifyToken,
  authController.updateProfile
);

router.patch(
  "/change-password",
  verifyToken,
  authController.changePassword
);

module.exports = router;