const {
  validateCreateLogBody,
  validateLogsQuery,
  validateStatsQuery,
} = require("../../validators/logsValidator");

describe("logsValidator", () => {
  test("defaults to 24h window and limit 50", () => {
    const result = validateLogsQuery({});

    expect(result.limit).toBe(50);
    expect(result.range).toBe("24h");
    expect(result.createdAt).toBeDefined();
    expect(result.createdAt.gte instanceof Date).toBe(true);
    expect(result.createdAt.lte instanceof Date).toBe(true);
  });

  test("supports custom from/to range", () => {
    const result = validateStatsQuery({
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-10T00:00:00.000Z",
    });

    expect(result.range).toBe("custom");
    expect(result.createdAt.gte.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(result.createdAt.lte.toISOString()).toBe("2026-03-10T00:00:00.000Z");
  });

  test("rejects invalid method", () => {
    expect(() => validateLogsQuery({ method: "INVALID" })).toThrow("Invalid method filter.");
  });

  test("rejects invalid range value", () => {
    expect(() => validateStatsQuery({ range: "3h" })).toThrow(
      "range must be one of: 24h, 7d, 30d, all."
    );
  });

  test("rejects from > to", () => {
    expect(() =>
      validateLogsQuery({
        from: "2026-03-15T00:00:00.000Z",
        to: "2026-03-01T00:00:00.000Z",
      })
    ).toThrow("from must be less than or equal to to.");
  });

  test("normalizes optional resource metrics on create", () => {
    const result = validateCreateLogBody({
      method: "GET",
      path: "/demo",
      durationMs: 100,
      cpuUsedMs: 10.5,
      memoryDeltaMb: "2.25",
      ioBytes: "1024",
      networkBytes: "2048",
      provider: "AWS",
      region: "AP-SOUTH-1",
    });

    expect(result.memoryDeltaMb).toBe(2.25);
    expect(result.ioBytes).toBe(1024);
    expect(result.networkBytes).toBe(2048);
    expect(result.provider).toBe("aws");
    expect(result.region).toBe("ap-south-1");
  });
});
