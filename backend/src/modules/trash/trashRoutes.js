const express = require("express");
const router = express.Router();

const trashController = require("./trashController");
const {
  verifyToken,
} = require("../../middleware/authMiddleware");

router.get("/", verifyToken, trashController.getTrash);


router.post(
  "/cleanup",
  verifyToken,
  trashController.cleanupExpiredTrash
);

router.patch(
  "/tasks/:id/restore",
  verifyToken,
  trashController.restoreTask
);

router.delete(
  "/tasks/:id/permanent",
  verifyToken,
  trashController.deleteTaskPermanent
);

router.patch(
  "/documents/:id/restore",
  verifyToken,
  trashController.restoreDocument
);

router.delete(
  "/documents/:id/permanent",
  verifyToken,
  trashController.deleteDocumentPermanent
);

module.exports = router;