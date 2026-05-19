const energyCalculator = require("../../utils/energyCalculator");

describe("energyCalculator", () => {
  test("keeps the legacy duration/cpu signature working", () => {
    const result = energyCalculator(100, 10);

    expect(result.energy).toBeGreaterThan(0);
    expect(result.cost).toBeGreaterThan(0);
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
});
