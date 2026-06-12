const router = require("express").Router();

// ✔ import đúng middleware
const { verifyToken } = require("../../middleware/authMiddleware");

// ✔ import toàn bộ controller
const controller = require("./chatController");

// =======================
// ROUTES
// =======================

router.post("/send", verifyToken, controller.sendMessage);

router.get(
  "/messages/:conversation_id",
  verifyToken,
  controller.getMessages
);

router.post("/active", verifyToken, controller.markActive);
router.post("/inactive", verifyToken, controller.markInactive);

module.exports = router;