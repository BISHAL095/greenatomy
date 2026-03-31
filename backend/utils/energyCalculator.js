const os = require("os");

// Heuristic energy model based on request duration and process CPU time.
function energyCalculator(durationMs, cpuUsedMs) {
  const cores = os.cpus().length;

  // Power estimates (in Watts)
  const maxPower = cores * 30;
  const idlePower = maxPower * 0.3;

  // Prevent division issues + clamp between 0 and 1
  const cpuUtil = durationMs > 0
    ? Math.min(Math.max(cpuUsedMs / durationMs, 0), 1)
    : 0;

  // Estimate power usage
  const power = idlePower + cpuUtil * (maxPower - idlePower);

  // Energy in kWh
  const energyKWh = (power * durationMs) / 3_600_000_000;

  // Cost (₹ per kWh)
  const costPerKWh = 8;
  const cost = energyKWh * costPerKWh;

  return {
    energy: Number(energyKWh.toFixed(8)),
    cost: Number(cost.toFixed(6)),
    cpuUtil: Number(cpuUtil.toFixed(3)),
  };
}

module.exports = energyCalculator;
