const pool = require("../../config/db");

// =======================
// GET UNITS
// =======================
exports.getUnits = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        created_at
      FROM units
      WHERE deleted_at IS NULL
      ORDER BY name ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET UNITS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// CREATE UNIT
// =======================
exports.createUnit = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Tên phòng ban không được để trống",
      });
    }

    const check = await pool.query(
      `
      SELECT id
      FROM units
      WHERE LOWER(name) = LOWER($1)
        AND deleted_at IS NULL
      `,
      [name.trim()]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        message: "Phòng ban đã tồn tại",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO units (name)
      VALUES ($1)
      RETURNING id, name, created_at
      `,
      [name.trim()]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("CREATE UNIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// UPDATE UNIT
// =======================
exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Tên phòng ban không được để trống",
      });
    }

    const check = await pool.query(
      `
      SELECT id
      FROM units
      WHERE LOWER(name) = LOWER($1)
        AND id != $2
        AND deleted_at IS NULL
      `,
      [name.trim(), id]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        message: "Tên phòng ban đã tồn tại",
      });
    }

    const result = await pool.query(
      `
      UPDATE units
      SET name = $1,
          updated_at = NOW()
      WHERE id = $2
        AND deleted_at IS NULL
      RETURNING id, name, updated_at
      `,
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Phòng ban không tồn tại",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE UNIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// DELETE UNIT
// =======================
exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const userCheck = await pool.query(
      `
      SELECT id
      FROM users
      WHERE unit_id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({
        message:
          "Không thể xóa phòng ban vì vẫn còn người dùng thuộc phòng ban này",
      });
    }

    const result = await pool.query(
      `
      UPDATE units
      SET deleted_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Phòng ban không tồn tại",
      });
    }

    res.json({ message: "Đã xóa phòng ban" });
  } catch (err) {
    console.error("DELETE UNIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};