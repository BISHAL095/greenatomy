const express = require("express");
const router = express.Router();
const logsController = require("../controllers/logsController");

router.get("/", logsController.getLogs);
router.get("/stats", logsController.getStats);

module.exports = router;
