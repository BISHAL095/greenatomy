const express = require("express");
const router = express.Router();
const logsController = require("../controllers/logsController");

// Keep routes thin: validation and DB logic live in controller/service layers.
router.get("/", logsController.getLogs);
router.get("/stats", logsController.getStats);

module.exports = router;
