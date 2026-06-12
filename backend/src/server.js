require("dotenv").config();

const http = require("http");
const app = require("./app");
const { initSocket } = require("./config/socket");
const { startTrashCleanupJob } = require("./jobs/trashCleanupJob");

// tạo server từ express
const server = http.createServer(app);

// gắn socket vào server
initSocket(server);

const PORT = process.env.PORT || 3000;

// dùng server.listen thay vì app.listen
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  startTrashCleanupJob();
});