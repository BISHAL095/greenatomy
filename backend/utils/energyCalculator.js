const os = require("os");

const DEFAULT_PROVIDER = "generic";
const DEFAULT_REGION = "global";

const PROVIDER_PUE = {
  aws: 1.135,
  azure: 1.125,
  gcp: 1.1,
  generic: 1.2,
};

// INR per kWh by region. PUE applies to datacenter compute/IO only —
// network egress is carrier-billed and excluded from PUE multiplication.
const REGION_TARIFF_INR_PER_KWH = {
  "ap-south-1":    8.0,  // AWS Mumbai
  "ap-south-2":    7.5,  // AWS Hyderabad
  "asia-south1":   8.0,  // GCP Mumbai
  "asia-south2":   7.5,  // GCP Delhi
  "central-india": 7.8,  // Azure Pune
  "south-india":   8.2,  // Azure Chennai
  india:           8.0,
  global:          8.0,
};

const COEFFICIENTS = {
  wattsPerCore:     30,
  idleRatio:        0.3,
  memoryWattsPerGb: 0.3725,
  ioKwhPerGb:       0.005,
  networkKwhPerGb:  0.06,
};

// W·ms per kWh: 1 kWh = 1000 W × 3600 s = 3,600,000,000 W·ms
const WMS_PER_KWH = 3_600_000_000;

// Cache core count — os.cpus() reads /proc/cpuinfo on every call.
const CORE_COUNT = os.cpus().length;

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

// Supports both legacy positional form energyCalculator(durationMs, cpuUsedMs)
// and the preferred options-object form energyCalculator({ durationMs, ... }).
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
  const options      = normalizeInput(durationOrOptions, maybeCpuUsedMs);
  const durationMs   = normalizeNumber(options.durationMs);
  const cpuUsedMs    = normalizeNumber(options.cpuUsedMs);
  const ioBytes      = normalizeNumber(options.ioBytes);
  const networkBytes = normalizeNumber(options.networkBytes);
  const provider     = normalizeKey(options.provider, DEFAULT_PROVIDER);
  const region       = normalizeKey(options.region, DEFAULT_REGION);

  // Floor memoryDeltaMb at zero: GC mid-request can produce a negative delta,
  // which would subtract from compute energy — an artefact, not real savings.
  const memoryDeltaMb = Math.max(0, normalizeNumber(options.memoryDeltaMb));

  // Use a simple per-core power envelope instead of hardware-specific telemetry.
  const maxPower  = CORE_COUNT * COEFFICIENTS.wattsPerCore;
  const idlePower = maxPower * COEFFICIENTS.idleRatio;

  // cpuUtil is expressed as a fraction of a single core's wall-clock time.
  // This matches the stored metric and existing test expectations.
  // NOTE: on multi-core machines this can exceed 1.0 before clamping —
  // a known limitation. To reflect true CPU capacity utilisation, divide by
  // (durationMs * CORE_COUNT), but that requires a test + migration update.
  const cpuUtil = durationMs > 0
    ? Math.min(Math.max(cpuUsedMs / durationMs, 0), 1)
    : 0;

  // Interpolate between idle and peak power based on observed utilisation.
  const cpuPower    = idlePower + cpuUtil * (maxPower - idlePower);
  const memoryPower = (memoryDeltaMb / 1024) * COEFFICIENTS.memoryWattsPerGb;

  const computeEnergyKWh = ((cpuPower + memoryPower) * durationMs) / WMS_PER_KWH;
  const ioEnergyKWh      = toGb(ioBytes)      * COEFFICIENTS.ioKwhPerGb;
  const networkEnergyKWh = toGb(networkBytes) * COEFFICIENTS.networkKwhPerGb;

  const pue = PROVIDER_PUE[provider] || PROVIDER_PUE[DEFAULT_PROVIDER];

  // PUE is a datacenter overhead multiplier (cooling, power conversion).
  // It applies to on-premises compute and IO draw only. Network egress energy
  // is billed by the carrier and must not be PUE-multiplied.
  const energyKWh = (computeEnergyKWh + ioEnergyKWh) * pue + networkEnergyKWh;

  const costPerKWh =
    REGION_TARIFF_INR_PER_KWH[region] ||
    REGION_TARIFF_INR_PER_KWH[DEFAULT_REGION];
  const cost = energyKWh * costPerKWh;

  return {
    // toFixed(8) can round very small values to "0.00000000"; that is correct
    // and honest — if energy is negligible it should display as zero.
    energy:  Number(energyKWh.toFixed(8)),
    cost:    Number(cost.toFixed(6)),
    cpuUtil: Number(cpuUtil.toFixed(3)),
    model: {
      provider,
      region,
      route: options.route || undefined,
      pue,
      costPerKWh,
      components: {
        computeKWh: Number((computeEnergyKWh * pue).toFixed(8)),
        ioKWh:      Number((ioEnergyKWh      * pue).toFixed(8)),
        networkKWh: Number((networkEnergyKWh      ).toFixed(8)), // no PUE — carrier-billed
      },
    },
  };
}

module.exports = energyCalculator;