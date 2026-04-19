const test = require("node:test");
const assert = require("node:assert/strict");

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
