const pool = require("../../config/db");
const bcrypt = require("bcryptjs");

// =======================
// CREATE USER
// =======================
exports.createUser = async (data) => {
  const {
  username,
  password,
  full_name,
  role_id,
  unit_id,
  chuc_vu,
} = data;

  // 🔥 check trùng username
  const check = await pool.query(
    `SELECT * FROM users WHERE username=$1`,
    [username]
  );

  if (check.rows.length > 0) {
    throw new Error("Username đã tồn tại");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
  `
 INSERT INTO users
(
  username,
  password,
  full_name,
  role_id,
  unit_id,
  chuc_vu,
  must_change_password
)
VALUES ($1,$2,$3,$4,$5,$6, TRUE)
RETURNING
  id,
  username,
  full_name,
  role_id,
  unit_id,
  chuc_vu,
  must_change_password
  `,
  [
    username,
    hashedPassword,
    full_name || null,
    role_id,
    unit_id || null,
    chuc_vu || null,
  ]
);

  return result.rows[0];
};

// =======================
// GET ALL USERS
// =======================
exports.getUsers = async () => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.full_name,
      u.role_id,
      u.unit_id,
      u.chuc_vu,
      u.created_at,
      u.failed_login_attempts,
      u.locked_until,
      u.must_change_password,
      r.code AS role_code,
      r.name AS role_name,

      un.name AS unit_name

    FROM users u

    LEFT JOIN roles r
      ON u.role_id = r.id

    LEFT JOIN units un
      ON u.unit_id = un.id

    WHERE u.deleted_at IS NULL

    ORDER BY u.id DESC
    `
  );

  return result.rows;
};

// =======================
// UPDATE USER
// =======================
exports.updateUser = async (id, data) => {
  const {
  username,
  full_name,
  role_id,
  unit_id,
  chuc_vu,
} = data;

  const result = await pool.query(
  `
  UPDATE users
  SET
    username = $1,
    full_name = $2,
    role_id = $3,
    unit_id = $4,
    chuc_vu = $5,
    updated_at = NOW()
  WHERE id = $6
    AND deleted_at IS NULL
  RETURNING
    id,
    username,
    full_name,
    role_id,
    unit_id,
    chuc_vu
  `,
  [
    username,
    full_name || null,
    role_id,
    unit_id || null,
    chuc_vu || null,
    id,
  ]
);
  if (result.rows.length === 0) {
    throw new Error("User không tồn tại");
  }

  return result.rows[0];
};

// =======================
// DELETE USER (SOFT)
// =======================
exports.deleteUser = async (id) => {
  const result = await pool.query(
    `UPDATE users
     SET deleted_at = NOW()
     WHERE id=$1
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("User không tồn tại");
  }
};

// =======================
// RESET PASSWORD
// =======================
exports.resetPassword = async (id, newPassword) => {
  if (!newPassword) {
    throw new Error("Thiếu mật khẩu mới");
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  const result = await pool.query(
    `
    UPDATE users
SET password = $1,
    must_change_password = TRUE,
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE id = $2
      AND deleted_at IS NULL
    RETURNING
  id,
  username,
  full_name,
  failed_login_attempts,
  locked_until,
  must_change_password
    `,
    [hashed, id]
  );

  if (result.rows.length === 0) {
    throw new Error("User không tồn tại");
  }

  return result.rows[0];
};
exports.getUsersByUnit =
async (unitId) => {

  const result =
    await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.chuc_vu,
        r.code AS role_code,
        r.name AS role_name
      FROM users u

      JOIN roles r
        ON u.role_id = r.id

      WHERE u.unit_id = $1
        AND r.code = 'nhan_vien'
        AND u.deleted_at IS NULL

      ORDER BY u.username ASC
      `,
      [unitId]
    );

  return result.rows;

};
// =======================
// UNLOCK USER
// =======================
exports.unlockUser = async (id) => {
  const result = await pool.query(
    `
    UPDATE users
    SET failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING
      id,
      username,
      full_name,
      failed_login_attempts,
      locked_until
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("User không tồn tại");
  }

  return result.rows[0];
};