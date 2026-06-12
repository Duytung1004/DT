const documentService = require("./documentService");

// =======================
// GET ALL
// =======================
exports.getDocuments = async (req, res) => {
  try {
    console.log("REQ USER DOCUMENTS:", req.user);

    const documents =
  await documentService.getDocuments(
    req.user,
    req.query
  );

    res.json(documents);
  } catch (err) {
    console.log("GET DOCUMENTS ERROR:", err.message);

    res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// GET BY ID
// =======================
exports.getDocumentById = async (req, res) => {
  try {
    const document =
      await documentService.getDocumentById(
        req.params.id,
        req.user
      );

    res.json(document);
  } catch (err) {
    res.status(404).json({
      message: err.message,
    });
  }
};

// =======================
// CREATE
// =======================
exports.createDocument = async (req, res) => {
  try {
    const document =
      await documentService.createDocument(
        req.body,
        req.user,
        req.file
      );

    res.json(document);
  } catch (err) {
    console.log(
      "CREATE DOCUMENT ERROR:",
      err
    );

    res.status(400).json({
      message: err.message,
    });
  }
};

// =======================
// UPDATE
// =======================
exports.updateDocument = async (req, res) => {
  try {
    const document =
      await documentService.updateDocument(
        req.params.id,
        req.body,
        req.user,
        req.file || null
      );

    res.json(document);
  } catch (err) {
    console.log("UPDATE DOCUMENT ERROR:", err);

    res.status(400).json({
      message: err.message,
    });
  }
};

// =======================
// DELETE
// =======================
exports.deleteDocument = async (req, res) => {
  try {
    await documentService.deleteDocument(
      req.params.id,
      req.user
    );

    res.json({
      message: "Xoá văn bản thành công",
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// =======================
// TYPES
// =======================
exports.getDocumentTypes = async (req, res) => {
  try {
    const data =
      await documentService.getDocumentTypes();

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// SOURCE LEVELS
// =======================
exports.getSourceLevels = async (req, res) => {
  try {
    const data =
      await documentService.getSourceLevels();

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// PRIORITIES
// =======================
exports.getPriorities = async (req, res) => {
  try {
    const data =
      await documentService.getPriorities();

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// =======================
// SECURITY LEVELS
// =======================
exports.getSecurityLevels = async (req, res) => {
  try {
    const data =
      await documentService.getSecurityLevels();

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
exports.getTasksByDocumentId = async (req, res) => {
  try {
    const tasks =
      await documentService.getTasksByDocumentId(
        req.params.id,
        req.user
      );

    res.json(tasks);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};
// =======================
// SUBMIT FOR OFFICE REVIEW
// =======================
exports.submitForOfficeReview = async (req, res) => {
  try {
    const document =
      await documentService.submitForOfficeReview(
        req.params.id,
        req.user
      );

    res.json(document);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// =======================
// OFFICE APPROVE
// =======================
exports.officeApproveDocument = async (req, res) => {
  try {
    const document =
      await documentService.officeApproveDocument(
        req.params.id,
        req.body,
        req.user
      );

    res.json(document);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// =======================
// OFFICE REJECT
// =======================
exports.officeRejectDocument = async (req, res) => {
  try {
    const document =
      await documentService.officeRejectDocument(
        req.params.id,
        req.body,
        req.user
      );

    res.json(document);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// =======================
// SEND TO LEADER
// =======================
exports.sendDocumentToLeader = async (req, res) => {
  try {
    const document =
      await documentService.sendDocumentToLeader(
        req.params.id,
        req.user
      );

    res.json(document);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};