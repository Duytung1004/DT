const pool = require("../../config/db");

// =======================
// GET ALL NOTIFICATIONS
// =======================
exports.getNotifications = async (userId, onlyUnread = false) => {
  let query = `
    SELECT
      id,
      user_id,
      type,
      title,
      content,
      task_id,
      document_id,
      is_read,
      created_at
    FROM notifications
    WHERE user_id = $1
  `;

  if (onlyUnread) {
    query += ` AND is_read = false`;
  }

  query += `
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
};
// =======================
// MARK AS READ
// =======================
exports.markAsRead = async (id, userId) => {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Notification không tồn tại hoặc không thuộc user");
  }

  return result.rows[0];
};

// =======================
// MARK ALL AS READ
// =======================
exports.markAllAsRead = async (userId) => {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false
     RETURNING id`,
    [userId]
  );

  return result.rowCount; // 🔥 số lượng đã update
};
// =======================
// UNREAD COUNT
// =======================
exports.getUnreadCount = async (userId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM notifications
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  return parseInt(result.rows[0].count);
};