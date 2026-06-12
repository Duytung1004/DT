const express = require("express");
const router = express.Router();

const analyticsController = require("./analyticsController");
const {
  verifyToken,
} = require("../../middleware/authMiddleware");

router.get("/", verifyToken, analyticsController.getAnalyticsOverview);

router.get(
  "/risk",
  verifyToken,
  analyticsController.getTaskRiskAnalytics
);

module.exports = router;