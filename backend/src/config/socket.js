let io;
const initSocket = (server) => {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: { origin: "*" }
  });
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("join_conversation", (conversationId) => {
    socket.join(`room_${conversationId}`);
    console.log(`User joined room_${conversationId}`);
  });
  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined personal room`);
  });
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`room_${conversationId}`);
    console.log(`User left room_${conversationId}`);
  });
  socket.on("typing", (conversationId) => {
    socket.to(`room_${conversationId}`).emit("user_typing");
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
  return io;
};
const getIO = () => {
  if (!io) throw new Error("Socket chưa được init");
  return io;
};

module.exports = { initSocket, getIO };