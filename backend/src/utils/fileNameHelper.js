// src/utils/fileNameHelper.js

exports.decodeFileName = (fileName = "") => {
  if (!fileName) return "";

  // Chỉ decode khi thấy dấu hiệu bị lỗi mã hóa
  const isBroken =
    fileName.includes("Ã") ||
    fileName.includes("Â") ||
    fileName.includes("á»") ||
    fileName.includes("Ä");

  if (!isBroken) {
    return fileName;
  }

  try {
    return Buffer.from(fileName, "latin1").toString("utf8");
  } catch (err) {
    return fileName;
  }
};

exports.safeFileName = (fileName = "") => {
  return fileName
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
};