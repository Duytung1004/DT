const express = require("express");
const router = express.Router();

const {
  verifyToken,
} = require("../../middleware/authMiddleware");

const {
  requirePermission,
} = require("../../middleware/rbacMiddleware");

const unitController = require("./unitController");

router.get(
  "/",
  verifyToken,
  unitController.getUnits
);

router.post(
  "/",
  verifyToken,
  requirePermission("unit:create"),
  unitController.createUnit
);

router.put(
  "/:id",
  verifyToken,
  requirePermission("unit:update"),
  unitController.updateUnit
);

router.delete(
  "/:id",
  verifyToken,
  requirePermission("unit:delete"),
  unitController.deleteUnit
);

module.exports = router;