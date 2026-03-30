jest.mock("../../validators/logsValidator", () => ({
  validateLogsQuery: jest.fn(),
  validateStatsQuery: jest.fn(),
}));

jest.mock("../../services/logsService", () => ({
  fetchLogs: jest.fn(),
  fetchStats: jest.fn(),
}));

const logsController = require("../../controllers/logsController");
const { validateLogsQuery, validateStatsQuery } = require("../../validators/logsValidator");
const logsService = require("../../services/logsService");

function createRes() {
  let statusCode = 200;
  let payload = null;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
  };
}

describe("logsController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getLogs returns logs payload", async () => {
    validateLogsQuery.mockReturnValue({ limit: 10 });
    logsService.fetchLogs.mockResolvedValue([{ id: "log-1" }]);

    const req = { query: { limit: "10" } };
    const res = createRes();

    await logsController.getLogs(req, res);

    expect(validateLogsQuery).toHaveBeenCalledWith(req.query);
    expect(logsService.fetchLogs).toHaveBeenCalledWith({ limit: 10 });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual([{ id: "log-1" }]);
  });

  test("getStats returns stats payload", async () => {
    validateStatsQuery.mockReturnValue({ range: "24h" });
    logsService.fetchStats.mockResolvedValue({ totalRequests: 2, range: "24h" });

    const req = { query: { range: "24h" } };
    const res = createRes();

    await logsController.getStats(req, res);

    expect(validateStatsQuery).toHaveBeenCalledWith(req.query);
    expect(logsService.fetchStats).toHaveBeenCalledWith({ range: "24h" });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ totalRequests: 2, range: "24h" });
  });

  test("getLogs maps validator errors to 400", async () => {
    const err = new Error("Invalid method filter.");
    err.statusCode = 400;
    validateLogsQuery.mockImplementation(() => {
      throw err;
    });

    const req = { query: { method: "BAD" } };
    const res = createRes();

    await logsController.getLogs(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ error: "Invalid method filter." });
  });
});
