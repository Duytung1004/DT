const router = require("express").Router();

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const controller = require("./dashboardController");

router.get(
  "/",
  verifyToken,
  controller.getDashboard
);

module.exports = router;