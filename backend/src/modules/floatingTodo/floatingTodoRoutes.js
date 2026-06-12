const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middleware/authMiddleware");
const floatingTodoController = require("./floatingTodoController");

router.get("/", verifyToken, floatingTodoController.getFloatingTodos);

module.exports = router;