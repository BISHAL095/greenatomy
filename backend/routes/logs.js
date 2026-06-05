const express = require("express");
const router = express.Router();
const apiKeyAuthMiddleware = require("../middlewares/apiKeyAuth");
const logsController = require("../controllers/logsController");

router.post("/", apiKeyAuthMiddleware, logsController.createLog);
router.get("/", logsController.getLogs);
router.get("/stats", logsController.getStats);
router.get("/summary", logsController.getSummary);
router.get("/external-breakdown", logsController.getExternalBreakdown);

module.exports = router;