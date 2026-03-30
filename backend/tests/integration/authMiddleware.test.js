process.env.AUTH_TOKEN = process.env.AUTH_TOKEN || "test-token";

const authMiddleware = require("../../middlewares/auth");

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

describe("auth middleware", () => {
  test("returns 401 when no auth token is provided", () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 401 for invalid bearer token", () => {
    const req = { headers: { authorization: "Bearer invalid-token" } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next for valid bearer token", () => {
    const req = { headers: { authorization: `Bearer ${process.env.AUTH_TOKEN}` } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  test("calls next for valid x-api-key", () => {
    const req = { headers: { "x-api-key": process.env.AUTH_TOKEN } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
