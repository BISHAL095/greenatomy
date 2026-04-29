jest.mock("../../validators/logsValidator", () => ({
  validateCreateLogBody: jest.fn(),
  validateLogsQuery: jest.fn(),
  validateStatsQuery: jest.fn(),
}));

jest.mock("../../services/logsService", () => ({
  createLog: jest.fn(),
  fetchLogs: jest.fn(),
  fetchStats: jest.fn(),
  fetchSummary: jest.fn(),
}));

const logsController = require("../../controllers/logsController");
const {
  validateCreateLogBody,
  validateLogsQuery,
  validateStatsQuery,
} = require("../../validators/logsValidator");
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
    logsService.resolveProjectScope = jest.fn().mockResolvedValue("project-1");
  });

  test("createLog returns created log payload", async () => {
    validateCreateLogBody.mockReturnValue({
      projectId: "project-1",
      method: "GET",
      path: "/demo",
      durationMs: 100,
      cpuUsedMs: 10,
    });
    logsService.resolveProjectScope = jest.fn().mockResolvedValue("project-1");
    logsService.createLog.mockResolvedValue({ id: "log-1" });

    const req = {
      auth: { type: "user", userId: "user-1" },
      body: { method: "GET", path: "/demo", durationMs: 100, cpuUsedMs: 10 },
    };
    const res = createRes();

    await logsController.createLog(req, res);

    expect(validateCreateLogBody).toHaveBeenCalledWith(req.body);
    expect(logsService.createLog).toHaveBeenCalledWith({
      projectId: "project-1",
      apiKeyId: null,
      method: "GET",
      path: "/demo",
      durationMs: 100,
      cpuUsedMs: 10,
    });
    expect(res.statusCode).toBe(201);
    expect(res.payload).toEqual({ id: "log-1" });
  });

  test("getLogs returns logs payload", async () => {
    validateLogsQuery.mockReturnValue({ limit: 10 });
    logsService.fetchLogs.mockResolvedValue([{ id: "log-1" }]);

    const req = { auth: { type: "user", userId: "user-1" }, query: { limit: "10" } };
    const res = createRes();

    await logsController.getLogs(req, res);

    expect(validateLogsQuery).toHaveBeenCalledWith(req.query);
    expect(logsService.fetchLogs).toHaveBeenCalledWith({ limit: 10, projectId: "project-1" });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual([{ id: "log-1" }]);
  });

  test("getStats returns stats payload", async () => {
    validateStatsQuery.mockReturnValue({ range: "24h" });
    logsService.fetchStats.mockResolvedValue({ totalRequests: 2, range: "24h" });

    const req = { auth: { type: "user", userId: "user-1" }, query: { range: "24h" } };
    const res = createRes();

    await logsController.getStats(req, res);

    expect(validateStatsQuery).toHaveBeenCalledWith(req.query);
    expect(logsService.fetchStats).toHaveBeenCalledWith({ range: "24h", projectId: "project-1" });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ totalRequests: 2, range: "24h" });
  });

  test("getSummary returns summary payload", async () => {
    validateStatsQuery.mockReturnValue({ range: "24h" });
    logsService.fetchSummary.mockResolvedValue({ status: "stable", range: "24h" });

    const req = { auth: { type: "user", userId: "user-1" }, query: { range: "24h" } };
    const res = createRes();

    await logsController.getSummary(req, res);

    expect(validateStatsQuery).toHaveBeenCalledWith(req.query);
    expect(logsService.fetchSummary).toHaveBeenCalledWith({ range: "24h", projectId: "project-1" });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ status: "stable", range: "24h" });
  });

  test("getLogs maps validator errors to 400", async () => {
    const err = new Error("Invalid method filter.");
    err.statusCode = 400;
    validateLogsQuery.mockImplementation(() => {
      throw err;
    });

    const req = { auth: { type: "user", userId: "user-1" }, query: { method: "BAD" } };
    const res = createRes();

    await logsController.getLogs(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ error: "Invalid method filter." });
  });
});
