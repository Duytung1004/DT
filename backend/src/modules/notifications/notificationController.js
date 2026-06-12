const notificationService = require("./notificationService.js");

// GET ALL
exports.getNotifications = async (req, res) => {
  try {
    const onlyUnread = req.query.unread === "true";

const data = await notificationService.getNotifications(
  req.user.userId,
  onlyUnread
);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// MARK ONE
exports.markAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAsRead(
      req.params.id,
      req.user.userId
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// MARK ALL
exports.markAllAsRead = async (req, res) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.userId);

    res.json({
      message: "Đã đọc tất cả",
      updated: count
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// UNREAD COUNT
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(
      req.user.userId
    );

    res.json({
      unread_count: count,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
