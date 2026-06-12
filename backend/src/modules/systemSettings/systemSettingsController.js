const pool = require("../../config/db");

// =======================
// GET SYSTEM SETTINGS
// =======================
exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT key, value
      FROM system_settings
      ORDER BY id ASC
      `
    );

    const settings = {};

    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (err) {
    console.log("GET SYSTEM SETTINGS ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi lấy cấu hình hệ thống",
    });
  }
};

// =======================
// UPDATE SYSTEM SETTINGS
// =======================
exports.updateSettings = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
  system_name,
  organization_name,
  system_description,
  contact_phone,
  contact_email,
  trash_retention_days,
} = req.body;

    await client.query("BEGIN");

    const items = {
  system_name,
  organization_name,
  system_description,
  contact_phone,
  contact_email,
  trash_retention_days,
};

    for (const [key, value] of Object.entries(items)) {
      await client.query(
        `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
        `,
        [key, value || ""]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Cập nhật cấu hình hệ thống thành công",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.log("UPDATE SYSTEM SETTINGS ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi cập nhật cấu hình hệ thống",
    });
  } finally {
    client.release();
  }
};