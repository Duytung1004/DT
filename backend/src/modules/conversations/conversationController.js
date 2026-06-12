const service = require("./conversationService");

// 🔥 lấy conversation theo task
exports.getByTask = async (req, res) => {
  try {
    const { task_id } = req.params;
const scope = req.query.scope || "leader_unit";

const convo =
  await service.getConversationByTask(
    task_id,
    scope
  );

    if (!convo) {
      return res.status(404).json({
        message: "Chưa có conversation",
      });
    }

    const isMember =
      await service.checkUserInConversation(
        convo.id,
        req.user.userId
      );

    if (!isMember) {
      return res.status(403).json({
        message:
          "Không có quyền truy cập cuộc trò chuyện này",
      });
    }

    res.json(convo);
  } catch (err) {
    console.log("GET CONVERSATION BY TASK ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// 🔥 add member
exports.addMember = async (req, res) => {
  try {
    const { conversation_id, user_id } = req.body;

    await service.addMember(conversation_id, user_id);

    res.json({ message: "Thêm thành viên thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔥 remove member
exports.removeMember = async (req, res) => {
  try {
    const { conversation_id, user_id } = req.body;

    await service.removeMember(conversation_id, user_id);

    res.json({ message: "Đã xóa thành viên" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔥 lấy members
exports.getMembers = async (req, res) => {
  try {
    const { conversation_id } = req.params;

    const isMember =
      await service.checkUserInConversation(
        conversation_id,
        req.user.userId
      );

    if (!isMember) {
      return res.status(403).json({
        message:
          "Không có quyền xem thành viên cuộc trò chuyện này",
      });
    }

    const members =
      await service.getMembers(conversation_id);

    res.json(members);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
// =======================
// GET MY TASK CONVERSATIONS
// =======================
exports.getMyConversations = async (req, res) => {
  try {
    const conversations =
      await service.getMyConversations(
        req.user.userId
      );

    res.json(conversations);
  } catch (err) {
    console.log(
      "GET MY CONVERSATIONS ERROR:",
      err
    );

    res.status(500).json({
      message: err.message,
    });
  }
};
// =======================
// MARK CONVERSATION AS READ
// =======================
exports.markConversationAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const result =
      await service.markConversationAsRead(
        req.params.conversationId,
        userId
      );

    res.json({
      message: "Đã đánh dấu cuộc trò chuyện là đã đọc",
      data: result,
    });
  } catch (err) {
    console.log(
      "MARK CONVERSATION READ ERROR:",
      err
    );

    res.status(400).json({
      message:
        err.message ||
        "Không thể đánh dấu cuộc trò chuyện là đã đọc",
    });
  }
};

// =======================
// GET TOTAL UNREAD COUNT
// =======================
exports.getTotalUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const result =
      await service.getTotalUnreadCount(userId);

    res.json(result);
  } catch (err) {
    console.log(
      "GET TOTAL UNREAD ERROR:",
      err
    );

    res.status(400).json({
      message:
        err.message ||
        "Không thể lấy tổng số tin chưa đọc",
    });
  }
};