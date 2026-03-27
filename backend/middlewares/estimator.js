const process = require("process");
const energyCalculator = require("../utils/energyCalculator");

function loggerMiddleware(req, res, next) {
  const startTime = Date.now();
  const startCPU = process.cpuUsage();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;

    const cpuDiff = process.cpuUsage(startCPU);
    const cpuUsedMs = (cpuDiff.user + cpuDiff.system) / 1000;

    const { energy, cost, cpuUtil } = energyCalculator(durationMs, cpuUsedMs);

    console.log(
      `${req.method} ${req.url} | duration: ${durationMs}ms | cpu: ${cpuUsedMs.toFixed(2)}ms | util: ${cpuUtil} | energy: ${energy} kWh | cost: ₹${cost}`
    );
  });

  next();
}

module.exports = loggerMiddleware;