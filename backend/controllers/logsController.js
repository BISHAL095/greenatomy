const { validateLogsQuery, validateStatsQuery } = require("../validators/logsValidator");
const logsService = require("../services/logsService");

// Map custom validation errors to HTTP codes; default to generic server error.
function getStatusCode(err) {
  return Number.isInteger(err.statusCode) ? err.statusCode : 500;
}

async function getLogs(req, res) {
  try {
    // Normalize request query before passing to service layer.
    const filters = validateLogsQuery(req.query);
    const logs = await logsService.fetchLogs(filters);
    res.json(logs);
  } catch (err) {
    const statusCode = getStatusCode(err);
    const message = statusCode === 500 ? "Failed to fetch logs" : err.message;

    console.error("Fetch logs failed:", err.message);
    res.status(statusCode).json({ error: message });
  }
}

async function getStats(req, res) {
  try {
    // Stats use the same filter model as logs for consistent behavior.
    const filters = validateStatsQuery(req.query);
    const stats = await logsService.fetchStats(filters);
    res.json(stats);
  } catch (err) {
    const statusCode = getStatusCode(err);
    const message = statusCode === 500 ? "Failed to fetch stats" : err.message;

    console.error("Stats fetch failed:", err.message);
    res.status(statusCode).json({ error: message });
  }
}

module.exports = {
  getLogs,
  getStats,
};
