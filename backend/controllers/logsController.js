const { validateLogsQuery, validateStatsQuery } = require("../validators/logsValidator");
const logsService = require("../services/logsService");

// Preserve validator-provided 4xx codes and fall back to 500 for unexpected failures.
function getStatusCode(err) {
  return Number.isInteger(err.statusCode) ? err.statusCode : 500;
}

async function getLogs(req, res) {
  try {
    // Controllers only pass normalized filters into the service layer.
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
    // Stats intentionally share the same filtering semantics as the logs endpoint.
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

async function getSummary(req, res) {
  try {
    // Summary is another aggregate view, so it uses the stats validator path.
    const filters = validateStatsQuery(req.query);
    const summary = await logsService.fetchSummary(filters);
    res.json(summary);
  } catch (err) {
    const statusCode = getStatusCode(err);
    const message = statusCode === 500 ? "Failed to fetch summary" : err.message;

    console.error("Summary fetch failed:", err.message);
    res.status(statusCode).json({ error: message });
  }
}

module.exports = {
  getLogs,
  getStats,
  getSummary,
};
