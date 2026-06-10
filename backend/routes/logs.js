const express = require("express");
const router = express.Router();
const apiKeyAuthMiddleware = require("../middlewares/apiKeyAuth");
const logsController = require("../controllers/logsController");
const authMiddleware = require("../middlewares/auth");


router.post("/", apiKeyAuthMiddleware, logsController.createLog);
router.get("/", authMiddleware, logsController.getLogs);
router.get("/stats", authMiddleware, logsController.getStats);
router.get("/summary", authMiddleware, logsController.getSummary);
router.get("/external-breakdown", authMiddleware, logsController.getExternalBreakdown);

module.exports = router;