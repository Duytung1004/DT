// src/modules/auth/authService.js
const pool = require("../../config/db");

exports.findUserByUsername = async (username) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1 AND deleted_at IS NULL",
    [username]
  );
  return result.rows[0];
};