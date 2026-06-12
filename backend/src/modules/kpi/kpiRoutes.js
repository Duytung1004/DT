const express = require("express");
const router = express.Router();

const kpiController = require("./kpiController");
const {
  verifyToken,
} = require("../../middleware/authMiddleware");

router.get("/overview", verifyToken, kpiController.getKpiOverview);

router.get(
  "/monthly-overview",
  verifyToken,
  kpiController.getKpiMonthlyOverview
);

router.get("/rankings", verifyToken, kpiController.getKpiRankings);

module.exports = router;