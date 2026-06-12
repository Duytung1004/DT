const express = require("express");
const router = express.Router();
const uploadDocument =
  require("../../middleware/uploadDocument");

const { verifyToken } =
  require("../../middleware/authMiddleware");

const { requirePermission } =
  require("../../middleware/rbacMiddleware");

const documentController =
  require("./documentController");

// =======================
// MASTER DATA
// =======================
router.get(
  "/types",
  verifyToken,
  documentController.getDocumentTypes
);

router.get(
  "/source-levels",
  verifyToken,
  documentController.getSourceLevels
);

router.get(
  "/priorities",
  verifyToken,
  documentController.getPriorities
);

router.get(
  "/security-levels",
  verifyToken,
  documentController.getSecurityLevels
);

// =======================
// DOCUMENT CRUD
// =======================
router.get(
  "/",
  verifyToken,
  documentController.getDocuments
);

// Lấy danh sách task liên quan đến văn bản
router.get(
  "/:id/tasks",
  verifyToken,
  documentController.getTasksByDocumentId
);

// =======================
// DOCUMENT WORKFLOW
// =======================
router.put(
  "/:id/submit-review",
  verifyToken,
  requirePermission("document:submit_for_review"),
  documentController.submitForOfficeReview
);

router.put(
  "/:id/office-approve",
  verifyToken,
  requirePermission("document:office_review"),
  documentController.officeApproveDocument
);

router.put(
  "/:id/office-reject",
  verifyToken,
  requirePermission("document:office_review"),
  documentController.officeRejectDocument
);

router.put(
  "/:id/send-to-leader",
  verifyToken,
  requirePermission("document:send_to_leader"),
  documentController.sendDocumentToLeader
);

router.get(
  "/:id",
  verifyToken,
  documentController.getDocumentById
);

router.post(
  "/",
  verifyToken,
  uploadDocument.single("file"),
  documentController.createDocument
);

router.put(
  "/:id",
  verifyToken,
  uploadDocument.single("file"),
  documentController.updateDocument
);

router.delete(
  "/:id",
  verifyToken,
  documentController.deleteDocument
);
module.exports = router;