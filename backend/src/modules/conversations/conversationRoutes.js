const router = require("express").Router();

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

const controller = require("./conversationController");

// Tổng số tin nhắn chưa đọc cho Sidebar
router.get(
  "/unread-count",
  verifyToken,
  controller.getTotalUnreadCount
);

// Lấy danh sách cuộc trò chuyện task mà user đang tham gia
router.get(
  "/my",
  verifyToken,
  controller.getMyConversations
);

// Đánh dấu một cuộc trò chuyện là đã đọc
router.put(
  "/:conversationId/read",
  verifyToken,
  controller.markConversationAsRead
);

// Lấy conversation theo task
router.get(
  "/task/:task_id",
  verifyToken,
  controller.getByTask
);

// Thêm thành viên vào conversation
router.post(
  "/add-member",
  verifyToken,
  requirePermission("task:assign"),
  controller.addMember
);

// Xóa thành viên khỏi conversation
router.post(
  "/remove-member",
  verifyToken,
  requirePermission("task:assign"),
  controller.removeMember
);

// Lấy danh sách thành viên
router.get(
  "/members/:conversation_id",
  verifyToken,
  controller.getMembers
);

module.exports = router;