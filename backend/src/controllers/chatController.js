const pool = require("../config/db");

// tạo conversation
exports.createConversation = async (req, res) => {
  const { userId } = req.body; // người muốn chat

  try {
    const convo = await pool.query(
      "INSERT INTO conversations DEFAULT VALUES RETURNING *"
    );

    const convoId = convo.rows[0].id;

    // thêm 2 user vào participants
    await pool.query(
      "INSERT INTO participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)",
      [convoId, req.user.id, userId]
    );

    res.json({ message: "Conversation created", convoId });
  } catch (err) {
    res.status(500).json(err);
  }
};
// gửi tin nhắn
exports.sendMessage = async (req, res) => {
  const { conversation_id, content } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversation_id, req.user.id, content]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json(err);
  }
};