const auditLogService = require("./auditLogService");

exports.getAuditLogs = async (req, res) => {
  try {
    const data = await auditLogService.getAuditLogs(req.query);

    res.json(data);
  } catch (err) {
    console.error("GET AUDIT LOGS ERROR:", err);

    res.status(500).json({
      message: err.message || "Lỗi lấy nhật ký hệ thống",
    });
  }
};