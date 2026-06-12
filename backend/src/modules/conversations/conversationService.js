const pool = require("../../config/db");

// 🔥 lấy conversation theo task
exports.getConversationByTask = async (
  task_id,
  scope = "leader_unit"
) => {
  const result = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE task_id = $1
      AND type = 'task'
      AND scope = $2
    `,
    [task_id, scope]
  );

  return result.rows[0];
};

// 🔥 tạo conversation cho task
exports.createConversation = async (
  task_id,
  created_by,
  scope = "leader_unit"
) => {
  const result = await pool.query(
    `
    INSERT INTO conversations
    (
      task_id,
      created_by,
      type,
      scope
    )
    VALUES ($1, $2, 'task', $3)
    RETURNING *
    `,
    [task_id, created_by, scope]
  );

  return result.rows[0];
};

// 🔥 add member
exports.addMember = async (conversation_id, user_id) => {
  await pool.query(
    `INSERT INTO conversation_members (conversation_id, user_id, is_active)
     VALUES ($1,$2,true)
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET is_active = true`,
    [conversation_id, user_id]
  );
};

// 🔥 remove member
exports.removeMember = async (conversation_id, user_id) => {
  await pool.query(
    `DELETE FROM conversation_members
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversation_id, user_id]
  );
};

// 🔥 lấy danh sách member
exports.getMembers = async (conversation_id) => {
  const result = await pool.query(
    `SELECT u.id, u.username
     FROM conversation_members cm
     JOIN users u ON cm.user_id = u.id
     WHERE cm.conversation_id = $1`,
    [conversation_id]
  );
  return result.rows;
};
// 🔥 kiểm tra user có thuộc conversation không
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
// =======================
// GET MY TASK CONVERSATIONS
// =======================
exports.getMyConversations = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      c.id AS conversation_id,
      c.task_id,
      c.type,
      c.scope,

      t.tieu_de AS task_title,
      t.han_chot,

      cm.unread_count,
      cm.is_active,

      last_msg.content AS last_message,
      last_msg.created_at AS last_message_at,

      sender.full_name AS last_sender_name,
      sender.username AS last_sender_username

    FROM conversation_members cm

    JOIN conversations c
      ON cm.conversation_id = c.id

    JOIN tasks t
      ON c.task_id = t.id

    LEFT JOIN LATERAL (
      SELECT
        m.content,
        m.sender_id,
        m.created_at
      FROM messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) last_msg ON true

    LEFT JOIN users sender
      ON sender.id = last_msg.sender_id

    WHERE cm.user_id = $1
      AND cm.is_active = true
      AND c.type = 'task'
      AND c.task_id IS NOT NULL
      AND t.deleted_at IS NULL

    ORDER BY
      COALESCE(last_msg.created_at, c.created_at) DESC
    `,
    [userId]
  );

  return result.rows;
};

// =======================
// MARK CONVERSATION AS READ
// =======================
exports.markConversationAsRead = async (
  conversation_id,
  user_id
) => {
  const result = await pool.query(
    `
    UPDATE conversation_members
    SET unread_count = 0
    WHERE conversation_id = $1
      AND user_id = $2
      AND is_active = true
    RETURNING *
    `,
    [conversation_id, user_id]
  );

  return result.rows[0];
};

// =======================
// GET TOTAL UNREAD COUNT
// =======================
exports.getTotalUnreadCount = async (user_id) => {
  const result = await pool.query(
    `
    SELECT
      COALESCE(SUM(unread_count), 0)::int AS total_unread
    FROM conversation_members
    WHERE user_id = $1
      AND is_active = true
    `,
    [user_id]
  );

  return result.rows[0];
};
