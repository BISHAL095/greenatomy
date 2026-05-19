const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

function loadHttpWithMockedAxios(mockAxios) {
  // Re-require the transport module with a temporary axios implementation for isolated tests.
  const httpPath = require.resolve("../http");
  const axiosPath = require.resolve("axios");

  delete require.cache[httpPath];

  const originalAxiosModule = require.cache[axiosPath];
  require.cache[axiosPath] = {
    id: axiosPath,
    filename: axiosPath,
    loaded: true,
    exports: mockAxios,
  };

  const request = require("../http");

  if (originalAxiosModule) {
    require.cache[axiosPath] = originalAxiosModule;
  } else {
    delete require.cache[axiosPath];
  }

  return request;
}

function loadSdkIndexWithMockedAxios(mockAxios) {
  const indexPath = require.resolve("../index");
  const middlewarePath = require.resolve("../middleware");
  const httpPath = require.resolve("../http");
  const axiosPath = require.resolve("axios");

  delete require.cache[indexPath];
  delete require.cache[middlewarePath];
  delete require.cache[httpPath];

  const originalAxiosModule = require.cache[axiosPath];
  require.cache[axiosPath] = {
    id: axiosPath,
    filename: axiosPath,
    loaded: true,
    exports: mockAxios,
  };

  const sdk = require("../index");

  if (originalAxiosModule) {
    require.cache[axiosPath] = originalAxiosModule;
  } else {
    delete require.cache[axiosPath];
  }

  return sdk;
}

test("returns response data on success", async () => {
  let capturedConfig;
  const request = loadHttpWithMockedAxios(async (config) => {
    capturedConfig = config;
    return {
      data: { ok: true },
    };
  });

  const result = await request({
    baseUrl: "http://localhost:5000",
    token: "secret",
    apiKey: "api-key-secret",
    timeout: 8000,
    method: "GET",
    url: "/logs",
    params: { page: 1 },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(capturedConfig.timeout, 8000);
  assert.equal(capturedConfig.headers.Authorization, "Bearer secret");
  assert.equal(capturedConfig.headers["x-api-key"], "api-key-secret");
});

test("maps 401 responses to UNAUTHORIZED", async () => {
  const request = loadHttpWithMockedAxios(async () => {
    const error = new Error("Unauthorized");
    error.response = {
      status: 401,
      data: { error: "Unauthorized" },
    };
    throw error;
  });

  await assert.rejects(
    request({
      baseUrl: "http://localhost:5000",
      token: "bad-token",
      method: "GET",
      url: "/logs",
    }),
    (error) => {
      assert.equal(error.name, "GreenatomySdkError");
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, "UNAUTHORIZED");
      return true;
    }
  );
});

test("maps timeout errors to TIMEOUT", async () => {
  const request = loadHttpWithMockedAxios(async () => {
    const error = new Error("timeout");
    error.code = "ECONNABORTED";
    throw error;
  });

  await assert.rejects(
    request({
      baseUrl: "http://localhost:5000",
      token: "secret",
      method: "GET",
      url: "/logs",
    }),
    (error) => {
      assert.equal(error.name, "GreenatomySdkError");
      assert.equal(error.code, "TIMEOUT");
      return true;
    }
  );
});

test("maps 429 responses to RATE_LIMITED", async () => {
  const request = loadHttpWithMockedAxios(async () => {
    const error = new Error("Too Many Requests");
    error.response = {
      status: 429,
      data: { error: "Too Many Requests" },
    };
    throw error;
  });

  await assert.rejects(
    request({
      baseUrl: "http://localhost:5000",
      apiKey: "rate-limited-key",
      method: "GET",
      url: "/logs",
    }),
    (error) => {
      assert.equal(error.name, "GreenatomySdkError");
      assert.equal(error.statusCode, 429);
      assert.equal(error.code, "RATE_LIMITED");
      return true;
    }
  );
});

test("middleware sends telemetry when the response finishes", async () => {
  let capturedConfig;
  const sdk = loadSdkIndexWithMockedAxios(async (config) => {
    capturedConfig = config;
    return { data: { ok: true } };
  });

  const middleware = sdk.greenatomyMiddleware({
    baseUrl: "http://localhost:5000",
    apiKey: "ga_live_test",
  });

  const req = {
    method: "GET",
    originalUrl: "/users?active=true",
  };
  const res = new EventEmitter();
  res.statusCode = 201;

  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  res.emit("finish");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(capturedConfig.method, "POST");
  assert.equal(capturedConfig.url, "http://localhost:5000/logs");
  assert.equal(capturedConfig.headers["x-api-key"], "ga_live_test");
  assert.equal(capturedConfig.data.method, "GET");
  assert.equal(capturedConfig.data.path, "/users?active=true");
  assert.equal(capturedConfig.data.statusCode, 201);
  assert.equal(typeof capturedConfig.data.durationMs, "number");
  assert.equal(typeof capturedConfig.data.cpuUsedMs, "number");
  assert.equal(typeof capturedConfig.data.memoryDeltaMb, "number");
  assert.equal(typeof capturedConfig.data.ioBytes, "number");
  assert.equal(typeof capturedConfig.data.networkBytes, "number");
});

test("middleware skips OPTIONS requests by default", async () => {
  let requestCount = 0;
  const sdk = loadSdkIndexWithMockedAxios(async () => {
    requestCount += 1;
    return { data: { ok: true } };
  });

  const middleware = sdk.greenatomyMiddleware({
    baseUrl: "http://localhost:5000",
    apiKey: "ga_live_test",
  });

  const req = { method: "OPTIONS", originalUrl: "/health" };
  const res = new EventEmitter();
  res.statusCode = 204;

  middleware(req, res, () => {});
  res.emit("finish");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(requestCount, 0);
});

test("middleware swallows transport errors and calls onError", async () => {
  const transportError = new Error("network down");
  let capturedError;
  const sdk = loadSdkIndexWithMockedAxios(async () => {
    throw transportError;
  });

  const middleware = sdk.greenatomyMiddleware({
    baseUrl: "http://localhost:5000",
    apiKey: "ga_live_test",
    onError: (error, req, res) => {
      capturedError = { error, req, res };
    },
  });

  const req = { method: "POST", url: "/jobs" };
  const res = new EventEmitter();
  res.statusCode = 500;

  middleware(req, res, () => {});
  res.emit("finish");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(capturedError.error.name, "GreenatomySdkError");
  assert.equal(capturedError.req, req);
  assert.equal(capturedError.res, res);
});
