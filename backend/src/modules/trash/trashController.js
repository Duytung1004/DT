const trashService = require("./trashService");

exports.getTrash = async (req, res) => {
  try {
    const data = await trashService.getTrash(req.user);

    res.json(data);
  } catch (err) {
    console.error("GET TRASH ERROR:", err);

    res.status(500).json({
      message: err.message || "Lỗi lấy dữ liệu thùng rác",
    });
  }
};

exports.restoreTask = async (req, res) => {
  try {
    const result = await trashService.restoreTask(
      req.params.id,
      req.user
    );

    res.json({
      message: "Khôi phục nhiệm vụ thành công",
      task: result,
    });
  } catch (err) {
    console.error("RESTORE TASK ERROR:", err);

    res.status(500).json({
      message: err.message || "Lỗi khôi phục nhiệm vụ",
    });
  }
};

exports.restoreDocument = async (req, res) => {
  try {
    const result = await trashService.restoreDocument(
      req.params.id,
      req.user
    );

    res.json({
      message: "Khôi phục văn bản thành công",
      document: result,
    });
  } catch (err) {
    console.error("RESTORE DOCUMENT ERROR:", err);

    res.status(500).json({
      message: err.message || "Lỗi khôi phục văn bản",
    });
  }
};
exports.deleteTaskPermanent = async (req, res) => {
  try {
    await trashService.deleteTaskPermanent(
      req.params.id,
      req.user
    );

    res.json({
      message: "Đã xóa vĩnh viễn nhiệm vụ",
    });
  } catch (err) {
    console.error("DELETE TASK PERMANENT ERROR:", err);

    res.status(500).json({
      message:
        err.message || "Lỗi xóa vĩnh viễn nhiệm vụ",
    });
  }
};

exports.deleteDocumentPermanent = async (req, res) => {
  try {
    await trashService.deleteDocumentPermanent(
      req.params.id,
      req.user
    );

    res.json({
      message: "Đã xóa vĩnh viễn văn bản",
    });
  } catch (err) {
    console.error("DELETE DOCUMENT PERMANENT ERROR:", err);

    res.status(500).json({
      message:
        err.message || "Lỗi xóa vĩnh viễn văn bản",
    });
  }
};
exports.cleanupExpiredTrash = async (req, res) => {
  try {
    const result = await trashService.cleanupExpiredTrash(
      req.user
    );

    res.json({
      message: "Dọn thùng rác quá hạn thành công",
      ...result,
    });
  } catch (err) {
    console.error("CLEANUP TRASH ERROR:", err);

    res.status(500).json({
      message:
        err.message || "Lỗi dọn thùng rác quá hạn",
    });
  }
};