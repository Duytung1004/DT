const pool = require("./src/config/db"); 
const bcrypt = require("bcryptjs");

async function resetPassword() {
  try {
    const username = "ruytugg";
    const newPassword = "Duytung1004";

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE username = $2
      RETURNING id, username, password
      `,
      [hashedPassword, username]
    );

    if (result.rows.length === 0) {
      console.log("Không tìm thấy user:", username);
      return;
    }

    console.log("Đã reset password cho:", result.rows[0].username);
    console.log("Hash mới:", result.rows[0].password);

    const check = await bcrypt.compare(
      newPassword,
      result.rows[0].password
    );

    console.log("Test bcrypt compare:", check);
  } catch (err) {
    console.error("RESET ERROR:", err);
  } finally {
    await pool.end();
  }
}

resetPassword();