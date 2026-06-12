const pool = require("../../config/db");

exports.getSecurityLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        username,
        action,
        status,
        ip_address,
        user_agent,
        message,
        created_at
      FROM security_logs
      ORDER BY id DESC
      LIMIT 30
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET SECURITY LOGS ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi lấy nhật ký bảo mật",
    });
  }
};