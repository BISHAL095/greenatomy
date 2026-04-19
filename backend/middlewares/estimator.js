const process = require("process");
const energyCalculator = require("../utils/energyCalculator");
const prisma = require("../lib/prisma");

// Ignore endpoints that are part of the monitoring surface itself.
function shouldSkipLogging(req) {
  return req.path.startsWith("/logs") || req.path === "/health" || req.method === "OPTIONS";
}

function loggerMiddleware(req, res, next) {
  if (shouldSkipLogging(req)) {
    next();
    return;
  }

  const startTime = Date.now();
  const startCPU = process.cpuUsage();

  // Capture metrics after the response finishes so duration and status code are final.
  res.on("finish", async () => {
    const durationMs = Date.now() - startTime;

    // `process.cpuUsage` returns microseconds consumed since `startCPU`.
    const cpuDiff = process.cpuUsage(startCPU);
    const cpuUsedMs = (cpuDiff.user + cpuDiff.system) / 1000;

    const { energy, cost, cpuUtil } = energyCalculator(durationMs, cpuUsedMs);

    // Keep a plain-text trace in stdout even if the database write fails later.
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} | ${durationMs}ms | CPU: ${cpuUsedMs.toFixed(
        2
      )}ms | Energy: ${energy.toFixed(8)} kWh | Cost: ₹${cost.toFixed(6)}`
    );
    try {
      // Persist the normalized request snapshot used by the analytics endpoints.
      await prisma.requestLog.create({
        data: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs,
          cpuUsedMs,
          cpuUtil,
          energyKwh: energy,
          cost,
        },
      });
    } catch (err) {
      // Logging must never block the original request lifecycle.
      console.error("DB write failed:", err.message);
    }
  });

  next();
}

module.exports = loggerMiddleware;
