const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =========================
// WRITE SECURITY LOG
// =========================
const writeSecurityLog = async ({
  userId = null,
  username = null,
  action,
  status,
  req,
  message,
}) => {
  try {
    await pool.query(
      `
      INSERT INTO security_logs
      (
        user_id,
        username,
        action,
        status,
        ip_address,
        user_agent,
        message
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        userId,
        username,
        action,
        status,
        req.ip,
        req.headers["user-agent"] || null,
        message,
      ]
    );
  } catch (err) {
    console.log("WRITE SECURITY LOG ERROR:", err.message);
  }
};


const getPermissionsByRoleId = async (roleId) => {
  const permissions = await pool.query(
    `
    SELECT permission
    FROM role_permissions
    WHERE role_id = $1
    `,
    [roleId]
  );

  return permissions.rows.map((p) => p.permission);
};
// =========================
// LOGIN
// =========================
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
  `
  SELECT
    u.*,
    r.code AS role,
    r.name AS role_name,
    un.name AS unit_name
  FROM users u

  JOIN roles r
    ON u.role_id = r.id

  LEFT JOIN units un
    ON u.unit_id = un.id

  WHERE (u.username = $1 OR u.email = $1)
    AND u.deleted_at IS NULL
  `,
  [username]
);

    if (result.rows.length === 0) {
      await writeSecurityLog({
        username,
        action: "login_failed",
        status: "failed",
        req,
        message: "Đăng nhập thất bại: user không tồn tại",
      });

      return res.status(401).json({
  message: "Tên đăng nhập hoặc mật khẩu không đúng",
});
    }

    const user = result.rows[0];

    // =========================
// CHECK ACCOUNT LOCKED
// =========================
if (
  user.locked_until &&
  new Date(user.locked_until) > new Date()
) {
  await writeSecurityLog({
    userId: user.id,
    username: user.username,
    action: "login_blocked",
    status: "blocked",
    req,
    message: "Đăng nhập bị chặn do tài khoản đang bị khóa",
  });

  return res.status(403).json({
    message:
      "Tài khoản đang bị khóa do đăng nhập sai quá nhiều lần. Vui lòng liên hệ quản trị viên để được mở khóa.",
    locked_until: user.locked_until,
  });
}

    // =========================
    // CHECK PASSWORD
    // =========================
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      const failedAttempts =
        Number(user.failed_login_attempts || 0) + 1;

      // Nếu sai từ 5 lần trở lên thì khóa 15 phút
      if (failedAttempts >= 5) {
        await pool.query(
          `
          UPDATE users
          SET failed_login_attempts = $1,
              locked_until = '9999-12-31 23:59:59',
              updated_at = NOW()
          WHERE id = $2
          `,
          [failedAttempts, user.id]
        );

        await writeSecurityLog({
          userId: user.id,
          username: user.username,
          action: "account_locked",
          status: "locked",
          req,
          message:
            "Tài khoản bị khóa vĩnh viễn do đăng nhập sai quá nhiều lần",
        });

        return res.status(403).json({
          message:
           "Bạn đã nhập sai mật khẩu quá nhiều lần. Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên để được mở khóa.",
        });
      }

      await pool.query(
        `
        UPDATE users
        SET failed_login_attempts = $1,
            updated_at = NOW()
        WHERE id = $2
        `,
        [failedAttempts, user.id]
      );

      await writeSecurityLog({
        userId: user.id,
        username: user.username,
        action: "login_failed",
        status: "failed",
        req,
        message: `Sai mật khẩu lần ${failedAttempts}`,
      });

      return res.status(401).json({
  message: `Tên đăng nhập hoặc mật khẩu không đúng. Bạn còn ${
    5 - failedAttempts
  } lần thử trước khi tài khoản bị khóa.`,
});
    }

    // =========================
    // LOGIN SUCCESS: RESET FAILED ATTEMPTS
    // =========================
    await pool.query(
      `
      UPDATE users
      SET failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
      `,
      [user.id]
    );

    await writeSecurityLog({
      userId: user.id,
      username: user.username,
      action: "login_success",
      status: "success",
      req,
      message: "Đăng nhập thành công",
    });

    const token = jwt.sign(
      {
        userId: user.id,
        roleId: user.role_id,
        role: user.role,
        unit_id: user.unit_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES || "1d",
      }
    );

    // Lấy permissions theo role
    const permissions = await pool.query(
      `
      SELECT permission
      FROM role_permissions
      WHERE role_id = $1
      `,
      [user.role_id]
    );

    const permissionList = permissions.rows.map(
      (p) => p.permission
    );

    res.json({
      message: "login success",
      token,
      user: {
  id: user.id,
  userId: user.id,

  username: user.username,
  full_name: user.full_name,
  email: user.email || null,

  role: user.role,
  role_name: user.role_name,
  role_id: user.role_id,

  unit_id: user.unit_id,
  unit_name: user.unit_name,
  chuc_vu: user.chuc_vu,

  must_change_password: user.must_change_password,

  permissions: permissionList,
},
    });
  } catch (err) {
    console.log("LOGIN ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// =========================
// REGISTER
// =========================
exports.register = async (req, res) => {
  try {
    const {
      username,
      password,
      full_name,
      role_id,
      unit_id,
    } = req.body;

    if (!unit_id) {
      return res.status(400).json({
        message: "Thiếu unit_id (phòng ban)",
      });
    }

    const checkUser = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({
        message: "Username đã tồn tại",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (
        username,
        password,
        full_name,
        role_id,
        unit_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        username,
        full_name,
        role_id,
        unit_id
      `,
      [
        username,
        hashed,
        full_name,
        role_id || 4,
        unit_id,
      ]
    );

    res.json({
      message: "register success",
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// =========================
// GET CURRENT USER
// =========================
exports.me = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.id AS "userId",
        u.username,
        u.full_name,
        u.email,
        u.role_id,
        u.unit_id,
        u.chuc_vu,
        u.must_change_password,

        r.code AS role,
        r.name AS role_name,

        un.name AS unit_name

      FROM users u

      JOIN roles r
        ON u.role_id = r.id

      LEFT JOIN units un
        ON u.unit_id = un.id

      WHERE u.id = $1
        AND u.deleted_at IS NULL
      `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
  return res.status(404).json({
    message: "User không tồn tại",
  });
}

const user = result.rows[0];

const permissionList =
  await getPermissionsByRoleId(user.role_id);

res.json({
  ...user,
  permissions: permissionList,
});

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// =========================
// UPDATE PROFILE
// =========================
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      full_name,
      username,
      email,
    } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        message: "Tên tài khoản không được để trống",
      });
    }

    const cleanUsername = username.trim();

    const cleanEmail =
      email && email.trim()
        ? email.trim()
        : null;

    // Kiểm tra username/email đã được người khác dùng chưa
    const check = await pool.query(
      `
      SELECT id
      FROM users
      WHERE deleted_at IS NULL
        AND id <> $1
        AND (
          username = $2
          OR (
            $3::text IS NOT NULL
            AND email = $3
          )
        )
      `,
      [
        userId,
        cleanUsername,
        cleanEmail,
      ]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        message:
          "Tên tài khoản hoặc email đã được sử dụng",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET
        full_name = $1,
        username = $2,
        email = $3,
        updated_at = NOW()
      WHERE id = $4
        AND deleted_at IS NULL
      `,
      [
        full_name && full_name.trim()
          ? full_name.trim()
          : null,
        cleanUsername,
        cleanEmail,
        userId,
      ]
    );

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.id AS "userId",
        u.username,
        u.full_name,
        u.email,
        u.role_id,
        u.unit_id,
        u.chuc_vu,

        r.code AS role,
        r.name AS role_name,

        un.name AS unit_name

      FROM users u

      JOIN roles r
        ON u.role_id = r.id

      LEFT JOIN units un
        ON u.unit_id = un.id

      WHERE u.id = $1
        AND u.deleted_at IS NULL
      `,
      [userId]
    );

        const updatedUser = result.rows[0];

    const permissionList =
      await getPermissionsByRoleId(updatedUser.role_id);

    res.json({
      message: "Cập nhật hồ sơ thành công",
      user: {
        ...updatedUser,
        permissions: permissionList,
      },
    });
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi cập nhật hồ sơ",
    });
  }
};

// =========================
// CHANGE PASSWORD
// =========================
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ mật khẩu",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    const result = await pool.query(
      `
      SELECT id, username, password
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      oldPassword,
      user.password
    );

    if (!isMatch) {
      await writeSecurityLog({
        userId: user.id,
        username: user.username,
        action: "change_password_failed",
        status: "failed",
        req,
        message:
          "Đổi mật khẩu thất bại: mật khẩu hiện tại không đúng",
      });

      return res.status(400).json({
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        message:
          "Mật khẩu mới không được trùng mật khẩu hiện tại",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await pool.query(
      `
      UPDATE users
      SET password = $1,
      must_change_password = FALSE,
      updated_at = NOW()
      WHERE id = $2
      `,
      [hashedPassword, userId]
    );

    await writeSecurityLog({
      userId: user.id,
      username: user.username,
      action: "change_password_success",
      status: "success",
      req,
      message: "Đổi mật khẩu thành công",
    });

    res.json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    console.log("CHANGE PASSWORD ERROR:", err);

    res.status(500).json({
      message: "Lỗi server khi đổi mật khẩu",
    });
  }
};