// src/modules/chat/chatService.js
const pool = require("../../config/db");

exports.createMessage = async (
  conversation_id,
  sender_id,
  content
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      WITH new_msg AS (
        INSERT INTO messages (
          conversation_id,
          sender_id,
          content
        )
        VALUES ($1, $2, $3)
        RETURNING *
      )
      SELECT
        m.*,
        u.username,
        u.full_name
      FROM new_msg m
      JOIN users u
        ON m.sender_id = u.id
      `,
      [conversation_id, sender_id, content]
    );

    const message = result.rows[0];

    await client.query(
      `
      UPDATE conversation_members
      SET unread_count = COALESCE(unread_count, 0) + 1
      WHERE conversation_id = $1
        AND user_id <> $2
        AND is_active = true
      `,
      [conversation_id, sender_id]
    );

    await client.query(
  `
  UPDATE conversation_members
  SET unread_count = 0
  WHERE conversation_id = $1
    AND user_id = $2
    AND is_active = true
  `,
  [conversation_id, sender_id]
);

    await client.query("COMMIT");

    return message;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};


exports.checkUserInConversation = async (
  conversation_id,
  user_id
) => {
  const result = await pool.query(
    `
    SELECT 1
    FROM conversation_members
    WHERE conversation_id = $1
      AND user_id = $2
      AND is_active = true
    `,
    [conversation_id, user_id]
  );

  return result.rows.length > 0;
};


exports.getMessagesByConversation = async (
  conversation_id
) => {
  const result = await pool.query(
    `
    SELECT
      m.*,
      u.username,
      u.full_name
    FROM messages m

    JOIN conversations c
      ON c.id = m.conversation_id

    LEFT JOIN users u
      ON m.sender_id = u.id

    WHERE m.conversation_id = $1
      AND c.type = 'task'
      AND c.task_id IS NOT NULL

    ORDER BY m.created_at ASC
    `,
    [conversation_id]
  );

  return result.rows;
};
exports.checkTaskConversation = async (
  conversation_id
) => {
  const result = await pool.query(
    `
    SELECT id
    FROM conversations
    WHERE id = $1
      AND type = 'task'
      AND task_id IS NOT NULL
    `,
    [conversation_id]
  );

  return result.rows.length > 0;
};