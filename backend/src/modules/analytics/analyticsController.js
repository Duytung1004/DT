const analyticsService = require("./analyticsService");


exports.getAnalyticsOverview = async (req, res) => {
  try {
    const data = await analyticsService.getAnalyticsOverview(
      req.user,
      req.query
    );

    res.json(data);
  } catch (err) {
    console.error("GET ANALYTICS ERROR:", err);

    res.status(500).json({
      message: err.message || "Lỗi lấy dữ liệu phân tích",
    });
  }
};
exports.getTaskRiskAnalytics = async (req, res) => {
  try {
    const data = await analyticsService.getTaskRiskAnalytics(
      req.user,
      req.query
    );

    res.json(data);
  } catch (err) {
    console.error("GET TASK RISK ANALYTICS ERROR:", err);

    res.status(500).json({
      message:
        err.message || "Lỗi lấy dữ liệu dự báo nguy cơ trễ hạn",
    });
  }
};