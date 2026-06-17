const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

// =======================
// BUILD SAFE FILE PATH
// =======================
const getAbsoluteFilePath = (filePath) => {
  const safeRelativePath = filePath
  .replace(/^\/uploads\/documents\//, "")
  .replace(/^\/uploads\//, "");

  return path.join(
    __dirname,
    "../../uploads",
    safeRelativePath
  );
};

// =======================
// VIEW FILE
// =======================
router.get("/view", (req, res) => {
  try {
    const { path: filePath, name } = req.query;

    if (!filePath) {
      return res.status(400).json({
        message: "Thiếu đường dẫn file",
      });
    }

    const absolutePath = getAbsoluteFilePath(filePath);

console.log("========== FILE DEBUG ==========");
console.log("FILE PATH:", filePath);
console.log("ABSOLUTE PATH:", absolutePath);
console.log(
  "FILE EXISTS:",
  fs.existsSync(absolutePath)
);
console.log("===============================");

if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        message: "File không tồn tại",
      });
    }

    const displayName =
      name || path.basename(absolutePath);

    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(
        displayName
      )}`
    );

    res.sendFile(absolutePath);
  } catch (err) {
    res.status(500).json({
      message: "View file error",
      error: err.message,
    });
  }
});

// =======================
// DOWNLOAD FILE
// =======================
router.get("/download", (req, res) => {
  try {
    const { path: filePath, name } = req.query;

    if (!filePath) {
      return res.status(400).json({
        message: "Thiếu đường dẫn file",
      });
    }

    const absolutePath = getAbsoluteFilePath(filePath);

console.log("========== FILE DEBUG ==========");
console.log("FILE PATH:", filePath);
console.log("ABSOLUTE PATH:", absolutePath);
console.log(
  "FILE EXISTS:",
  fs.existsSync(absolutePath)
);
console.log("===============================");

if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        message: "File không tồn tại",
      });
    }

    res.download(
      absolutePath,
      name || path.basename(absolutePath)
    );
  } catch (err) {
    res.status(500).json({
      message: "Download error",
      error: err.message,
    });
  }
});

module.exports = router;