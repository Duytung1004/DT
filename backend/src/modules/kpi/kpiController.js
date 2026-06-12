const kpiService = require("./kpiService");

exports.getKpiOverview = async (req, res) => {
  try {
    const result = await kpiService.getKpiOverview(req.user);

    res.json(result);
  } catch (err) {
    console.error("GET KPI OVERVIEW ERROR:", err);

    res.status(500).json({
      message: "Không thể tải dữ liệu KPI",
      error: err.message,
    });
  
  }
};
exports.getKpiRankings = async (req, res) => {
  try {
    const result = await kpiService.getKpiRankings(req.user);

    res.json(result);
  } catch (err) {
    console.error("GET KPI RANKINGS ERROR:", err);

    res.status(500).json({
      message: "Không thể tải xếp hạng KPI",
      error: err.message,
    });
  }
};
exports.getKpiMonthlyOverview = async (req, res) => {
  try {
    const result = await kpiService.getKpiMonthlyOverview(req.user, {
      period_key: req.query.period_key,
    });

    res.json(result);
  } catch (err) {
    console.error("GET KPI MONTHLY OVERVIEW ERROR:", err);

    res.status(500).json({
      message: "Không thể tải KPI tháng",
      error: err.message,
    });
  }
};