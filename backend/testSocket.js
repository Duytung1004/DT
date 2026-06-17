const { io } = require("socket.io-client");

// 🔥 đổi port nếu cần
const socket = io("${import.meta.env.VITE_API_URL}");

// 👉 giả lập user 2 (người nhận)
const userId = 2;

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  // 🔥 join room user
  socket.emit("join_user", userId);
  console.log("Joined user room:", userId);
});

// 🔥 lắng nghe notification
socket.on("new_notification", (data) => {
  console.log("🔔 Notification received:", data);
});

// debug
socket.on("disconnect", () => {
  console.log("Disconnected");
});