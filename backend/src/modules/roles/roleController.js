const pool = require("../../config/db");

// =======================
// GET ROLES
// =======================
exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        code,
        name
      FROM roles
      ORDER BY id ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET ROLES ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi lấy danh sách vai trò",
    });
  }
};

// =======================
// GET ROLE PERMISSIONS
// =======================
exports.getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;

    const roleCheck = await pool.query(
      `
      SELECT id, code, name
      FROM roles
      WHERE id = $1
      `,
      [id]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Vai trò không tồn tại",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        role_id,
        permission
      FROM role_permissions
      WHERE role_id = $1
      ORDER BY permission ASC
      `,
      [id]
    );

    res.json({
      role: roleCheck.rows[0],
      permissions: result.rows,
    });
  } catch (err) {
    console.log("GET ROLE PERMISSIONS ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi lấy quyền của vai trò",
    });
  }
};

// =======================
// UPDATE ROLE PERMISSIONS
// =======================
exports.updateRolePermissions = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        message: "Danh sách quyền không hợp lệ",
      });
    }

    await client.query("BEGIN");

    const roleCheck = await client.query(
      `
      SELECT id, code, name
      FROM roles
      WHERE id = $1
      `,
      [id]
    );

    if (roleCheck.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Vai trò không tồn tại",
      });
    }

    // Xóa quyền cũ
    await client.query(
      `
      DELETE FROM role_permissions
      WHERE role_id = $1
      `,
      [id]
    );

    // Thêm quyền mới
    for (const permission of permissions) {
      if (!permission || !permission.trim()) continue;

      await client.query(
        `
        INSERT INTO role_permissions
        (
          role_id,
          permission
        )
        VALUES ($1, $2)
        `,
        [id, permission.trim()]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Cập nhật quyền thành công",
      role: roleCheck.rows[0],
      permissions,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.log("UPDATE ROLE PERMISSIONS ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi cập nhật quyền",
    });
  } finally {
    client.release();
  }
};