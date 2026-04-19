const os = require("os");

// Estimate request energy from wall-clock time and process CPU consumption.
function energyCalculator(durationMs, cpuUsedMs) {
  const cores = os.cpus().length;

  // Use a simple per-core power envelope instead of hardware-specific telemetry.
  const maxPower = cores * 30;
  const idlePower = maxPower * 0.3;

  // Convert CPU time into a utilization ratio and clamp to a sensible range.
  const cpuUtil = durationMs > 0
    ? Math.min(Math.max(cpuUsedMs / durationMs, 0), 1)
    : 0;

  // Interpolate between idle and peak power based on observed utilization.
  const power = idlePower + cpuUtil * (maxPower - idlePower);

  // Watt-milliseconds to kilowatt-hours: divide by 3.6e9.
  const energyKWh = (power * durationMs) / 3_600_000_000;

  // Apply the local tariff used throughout the dashboard.
  const costPerKWh = 8;
  const cost = energyKWh * costPerKWh;

  return {
    // Round here so storage and API output stay stable across environments.
    energy: Number(energyKWh.toFixed(8)),
    cost: Number(cost.toFixed(6)),
    cpuUtil: Number(cpuUtil.toFixed(3)),
  };
}

module.exports = energyCalculator;
