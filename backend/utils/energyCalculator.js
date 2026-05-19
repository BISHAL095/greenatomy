const os = require("os");

const DEFAULT_PROVIDER = "generic";
const DEFAULT_REGION = "global";

const PROVIDER_PUE = {
  aws: 1.135,
  azure: 1.125,
  gcp: 1.1,
  generic: 1.2,
};

const REGION_TARIFF_INR_PER_KWH = {
  "ap-south-1": 8,
  "asia-south1": 8,
  "central-india": 8,
  india: 8,
  global: 8,
};

const COEFFICIENTS = {
  wattsPerCore: 30,
  idleRatio: 0.3,
  memoryWattsPerGb: 0.3725,
  ioKwhPerGb: 0.005,
  networkKwhPerGb: 0.06,
};

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function normalizeKey(value, fallback) {
  if (!value) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  return normalized || fallback;
}

function toGb(bytes) {
  return bytes / 1_073_741_824;
}

function normalizeInput(durationOrOptions, cpuUsedMs) {
  if (
    durationOrOptions &&
    typeof durationOrOptions === "object" &&
    !Array.isArray(durationOrOptions)
  ) {
    return durationOrOptions;
  }

  return {
    durationMs: durationOrOptions,
    cpuUsedMs,
  };
}

// Estimate request energy from CPU, memory, IO, and network activity.
function energyCalculator(durationOrOptions, maybeCpuUsedMs) {
  const options = normalizeInput(durationOrOptions, maybeCpuUsedMs);
  const durationMs = normalizeNumber(options.durationMs);
  const cpuUsedMs = normalizeNumber(options.cpuUsedMs);
  const memoryDeltaMb = normalizeNumber(options.memoryDeltaMb);
  const ioBytes = normalizeNumber(options.ioBytes);
  const networkBytes = normalizeNumber(options.networkBytes);
  const provider = normalizeKey(options.provider, DEFAULT_PROVIDER);
  const region = normalizeKey(options.region, DEFAULT_REGION);
  const cores = os.cpus().length;

  // Use a simple per-core power envelope instead of hardware-specific telemetry.
  const maxPower = cores * COEFFICIENTS.wattsPerCore;
  const idlePower = maxPower * COEFFICIENTS.idleRatio;

  // Convert CPU time into a utilization ratio and clamp to a sensible range.
  const cpuUtil = durationMs > 0
    ? Math.min(Math.max(cpuUsedMs / durationMs, 0), 1)
    : 0;

  // Interpolate between idle and peak power based on observed utilization.
  const cpuPower = idlePower + cpuUtil * (maxPower - idlePower);
  const memoryPower = (memoryDeltaMb / 1024) * COEFFICIENTS.memoryWattsPerGb;

  // Watt-milliseconds to kilowatt-hours: divide by 3.6e9.
  const computeEnergyKWh =
    ((cpuPower + memoryPower) * durationMs) / 3_600_000_000;
  const ioEnergyKWh = toGb(ioBytes) * COEFFICIENTS.ioKwhPerGb;
  const networkEnergyKWh =
    toGb(networkBytes) * COEFFICIENTS.networkKwhPerGb;
  const pue = PROVIDER_PUE[provider] || PROVIDER_PUE[DEFAULT_PROVIDER];
  const energyKWh = (computeEnergyKWh + ioEnergyKWh + networkEnergyKWh) * pue;

  // Apply the local tariff used throughout the dashboard.
  const costPerKWh =
    REGION_TARIFF_INR_PER_KWH[region] ||
    REGION_TARIFF_INR_PER_KWH[DEFAULT_REGION];
  const cost = energyKWh * costPerKWh;

  return {
    // Round here so storage and API output stay stable across environments.
    energy: Number(energyKWh.toFixed(8)),
    cost: Number(cost.toFixed(6)),
    cpuUtil: Number(cpuUtil.toFixed(3)),
    model: {
      provider,
      region,
      route: options.route || undefined,
      pue,
      costPerKWh,
      components: {
        computeKWh: Number((computeEnergyKWh * pue).toFixed(8)),
        ioKWh: Number((ioEnergyKWh * pue).toFixed(8)),
        networkKWh: Number((networkEnergyKWh * pue).toFixed(8)),
      },
    },
  };
}

module.exports = energyCalculator;
