import { io } from "socket.io-client";

const socket = io("${import.meta.env.VITE_API_URL}", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000,
});

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("Socket connect error:", err.message);
});

export default socket;