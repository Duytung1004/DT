const floatingTodoService = require("./floatingTodoService");

exports.getFloatingTodos = async (req, res) => {
  try {
    const todos = await floatingTodoService.getFloatingTodos(req.user);

    res.json(todos);
  } catch (err) {
    console.error("GET FLOATING TODOS ERROR:", err);

    res.status(500).json({
      message: "Lỗi lấy danh sách việc cần xử lý",
    });
  }
};