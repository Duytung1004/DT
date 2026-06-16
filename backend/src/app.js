require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

// 🔥 Dùng biến môi trường cho origin để linh hoạt giữa localhost và Vercel
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// 🔥 limit luôn cho chắc
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "../uploads")
  )
);
app.use("/api", require("./routes"));

module.exports = app;