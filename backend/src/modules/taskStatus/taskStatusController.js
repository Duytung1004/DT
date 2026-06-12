const pool = require("../../config/db");

// =======================
// GET TASK STATUSES
// =======================
exports.getTaskStatuses = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        code,
        name
      FROM trang_thai_task
      ORDER BY id ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET TASK STATUSES ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi lấy danh sách trạng thái",
    });
  }
};

// =======================
// UPDATE TASK STATUS NAME
// =======================
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Tên trạng thái không được để trống",
      });
    }

    const result = await pool.query(
      `
      UPDATE trang_thai_task
      SET name = $1
      WHERE id = $2
      RETURNING id, code, name
      `,
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Trạng thái không tồn tại",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log("UPDATE TASK STATUS ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi cập nhật trạng thái",
    });
  }
};