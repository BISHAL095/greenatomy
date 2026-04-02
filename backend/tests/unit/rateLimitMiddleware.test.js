const { createRateLimitMiddleware } = require("../../middlewares/rateLimit");

function createRes() {
  let statusCode = 200;
  let payload = null;
  const headers = {};

  return {
    set(name, value) {
      headers[name] = value;
      return this;
    },
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
    get headers() {
      return headers;
    },
  };
}

describe("rate limit middleware", () => {
  test("allows requests under the limit", () => {
    const middleware = createRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 2,
    });
    const next = jest.fn();

    middleware({ headers: {}, ip: "127.0.0.1" }, createRes(), next);
    middleware({ headers: {}, ip: "127.0.0.1" }, createRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  test("returns 429 once the limit is exceeded", () => {
    const middleware = createRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 1,
    });
    const next = jest.fn();

    middleware({ headers: {}, ip: "127.0.0.1" }, createRes(), next);

    const res = createRes();
    middleware({ headers: {}, ip: "127.0.0.1" }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(429);
    expect(res.payload).toEqual({
      error: "Too many requests",
      retryAfterSeconds: 60,
    });
    expect(res.headers["Retry-After"]).toBe("60");
  });

  test("uses x-forwarded-for when present", () => {
    const middleware = createRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 1,
    });

    middleware(
      { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }, ip: "127.0.0.1" },
      createRes(),
      jest.fn()
    );

    const res = createRes();
    middleware(
      { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }, ip: "127.0.0.1" },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(429);
  });
});
