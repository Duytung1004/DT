const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token không hợp lệ",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role_id,
        u.unit_id,
        r.code AS role
      FROM users u
      JOIN roles r 
        ON u.role_id = r.id
      WHERE u.id = $1
        AND u.deleted_at IS NULL
      `,
      [decoded.userId]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        message: "User không tồn tại",
      });
    }

    const userData = user.rows[0];

    const perm = await pool.query(
      `
      SELECT permission
      FROM role_permissions
      WHERE role_id = $1
      `,
      [userData.role_id]
    );

    const permissions = perm.rows.map(
      (p) => p.permission
    );

    req.user = {
      userId: userData.id,
      id: userData.id,

      username: userData.username,
      full_name: userData.full_name,

      roleId: userData.role_id,
      role_id: userData.role_id,
      role: userData.role,

      unit_id: userData.unit_id,

      permissions,
    };

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);

    return res.status(403).json({
      message: "Invalid token",
    });
  }
};

module.exports = { verifyToken };