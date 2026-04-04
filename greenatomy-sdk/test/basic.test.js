const test = require("node:test");
const assert = require("node:assert/strict");

function loadHttpWithMockedAxios(mockAxios) {
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
  const request = loadHttpWithMockedAxios(async () => ({
    data: { ok: true },
  }));

  const result = await request({
    baseUrl: "http://localhost:5000",
    token: "secret",
    method: "GET",
    url: "/logs",
    params: { page: 1 },
  });

  assert.deepEqual(result, { ok: true });
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
