const process = require("process");
const energyCalculator = require("../utils/energyCalculator");
const prisma = require("../lib/prisma");

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

  res.on("finish", async () => {
    const durationMs = Date.now() - startTime;

    const cpuDiff = process.cpuUsage(startCPU);
    const cpuUsedMs = (cpuDiff.user + cpuDiff.system) / 1000;

    const { energy, cost, cpuUtil } = energyCalculator(durationMs, cpuUsedMs);

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} | ${durationMs}ms | CPU: ${cpuUsedMs.toFixed(
        2
      )}ms | Energy: ${energy.toFixed(8)} kWh | Cost: ₹${cost.toFixed(6)}`
    );
    try {
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
      console.error("DB write failed:", err.message);
    }
  });

  next();
}

module.exports = loggerMiddleware;
