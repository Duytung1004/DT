const pool = require("../config/db");

// =========================
// CHECK PERMISSION (CHUẨN DB)
// =========================
const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      // 🔥 lấy roleId từ token
      const roleId = req.user.roleId;

      if (!roleId) {
        return res.status(401).json({
          message: "Không xác định được vai trò người dùng",
        });
      }

      // 🔥 check quyền trong DB
      const result = await pool.query(
        `
        SELECT * 
        FROM role_permissions
        WHERE role_id = $1 AND permission = $2
        `,
        [roleId, permissionCode]
      );

      // ❌ không có quyền
      if (result.rows.length === 0) {
        return res.status(403).json({
          message: "Bạn không có quyền thực hiện hành động này",
        });
      }

      // ✅ có quyền
      next();
    } catch (err) {
      console.error("RBAC Error:", err);

      res.status(500).json({
        message: "Lỗi kiểm tra quyền",
        error: err.message,
      });
    }
  };
};

// =========================
// CHECK ROLE (OPTIONAL)
// =========================
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const roleId = req.user.roleId;

    if (!allowedRoles.includes(roleId)) {
      return res.status(403).json({
        message: "Không đúng vai trò",
      });
    }

    next();
  };
};

module.exports = {
  requirePermission,
  requireRole,
};