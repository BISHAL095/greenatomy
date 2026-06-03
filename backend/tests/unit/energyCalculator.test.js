const energyCalculator = require("../../utils/energyCalculator");

describe("energyCalculator", () => {
  test("keeps the legacy duration/cpu signature working", () => {
    const result = energyCalculator(100, 10);

    // energy and cost are >= 0: toFixed(8) can honestly round negligible
    // values to zero, which is correct behavior — not a bug.
    expect(result.energy).toBeGreaterThanOrEqual(0);
    expect(result.cost).toBeGreaterThanOrEqual(0);
    expect(result.cpuUtil).toBe(0.1);
  });

  test("accepts resource metrics in object form", () => {
    const result = energyCalculator({
      durationMs: 250,
      cpuUsedMs: 125,
      memoryDeltaMb: 64,
      ioBytes: 1024 * 1024,
      networkBytes: 2 * 1024 * 1024,
      provider: "aws",
      region: "ap-south-1",
      route: "GET /demo",
    });

    expect(result.energy).toBeGreaterThan(0);
    expect(result.cost).toBeGreaterThan(0);
    expect(result.cpuUtil).toBe(0.5);
    expect(result.model.provider).toBe("aws");
    expect(result.model.region).toBe("ap-south-1");
    expect(result.model.route).toBe("GET /demo");
    expect(result.model.components.networkKWh).toBeGreaterThan(0);
  });

  test("network energy is not PUE-multiplied", () => {
    const networkOnly = energyCalculator({
      durationMs: 0,
      cpuUsedMs: 0,
      networkBytes: 1_073_741_824, // 1 GB
      provider: "aws",
      region: "ap-south-1",
    });

    const computeOnly = energyCalculator({
      durationMs: 0,
      cpuUsedMs: 0,
      networkBytes: 0,
      provider: "aws",
      region: "ap-south-1",
    });

    // 1 GB network = 0.06 kWh, no PUE applied
    expect(networkOnly.model.components.networkKWh).toBeCloseTo(0.06, 5);
    expect(networkOnly.model.components.computeKWh).toBe(0);
    expect(computeOnly.model.components.networkKWh).toBe(0);
  });

  test("negative memoryDeltaMb is floored to zero", () => {
    const withNegative = energyCalculator({
      durationMs: 100,
      cpuUsedMs: 10,
      memoryDeltaMb: -128,
    });

    const withZero = energyCalculator({
      durationMs: 100,
      cpuUsedMs: 10,
      memoryDeltaMb: 0,
    });

    // GC-induced negative delta must not subtract from compute energy
    expect(withNegative.energy).toBe(withZero.energy);
  });

  test("zero duration produces zero cpuUtil and non-negative energy", () => {
    const result = energyCalculator({
      durationMs: 0,
      cpuUsedMs: 0,
    });

    expect(result.cpuUtil).toBe(0);
    expect(result.energy).toBeGreaterThanOrEqual(0);
  });

  test("unknown provider and region fall back to defaults", () => {
    const result = energyCalculator({
      durationMs: 100,
      cpuUsedMs: 50,
      provider: "unknown-cloud",
      region: "mars-east-1",
    });

    expect(result.model.provider).toBe("unknown-cloud");
    expect(result.model.region).toBe("mars-east-1");
    // Falls back to generic PUE (1.2) and global tariff (8.0)
    expect(result.model.pue).toBe(1.2);
    expect(result.model.costPerKWh).toBe(8.0);
  });

  test("model components sum to total energy", () => {
    const result = energyCalculator({
      durationMs: 200,
      cpuUsedMs: 100,
      memoryDeltaMb: 32,
      ioBytes: 512 * 1024,
      networkBytes: 1024 * 1024,
      provider: "gcp",
      region: "asia-south1",
    });

    const componentSum =
      result.model.components.computeKWh +
      result.model.components.ioKWh +
      result.model.components.networkKWh;

    expect(componentSum).toBeCloseTo(result.energy, 6);
  });
});