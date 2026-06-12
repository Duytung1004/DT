const pool = require("../config/db");
const { getIO } = require("../config/socket");

exports.createNotification = async ({
  userId,
  type,
  title,
  taskId = null,
  documentId = null,
  content = null,
  conversationId = null,
}) => {
  // Không có user nhận thì không tạo thông báo
  if (!userId) return null;

  const result = await pool.query(
    `
    INSERT INTO notifications (
      user_id,
      type,
      title,
      task_id,
      document_id,
      content,
      is_read,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
    RETURNING *
    `,
    [
      userId,
      type,
      title,
      taskId,
      documentId,
      content,
    ]
  );

  const notification = result.rows[0];

  try {
    const io = getIO();

    io.to(`user_${userId}`).emit("new_notification", {
      ...notification,
      conversation_id: conversationId,
    });
  } catch (err) {
    console.log(
      "EMIT NOTIFICATION ERROR:",
      err.message
    );
  }

  return notification;
};