const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  decodeFileName,
  safeFileName,
} = require("../utils/fileNameHelper");

// ======================
// CREATE UPLOAD FOLDER
// ======================
const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// ======================
// STORAGE
// ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const originalName = safeFileName(
      decodeFileName(file.originalname)
    );

    const uniqueName =
      Date.now() + "-" + originalName;

    cb(null, uniqueName);
  },
});

// ======================
// FILE FILTER
// ======================
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Chỉ hỗ trợ PDF, DOCX, TXT"),
      false
    );
  }
};

// ======================
// EXPORT
// ======================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;