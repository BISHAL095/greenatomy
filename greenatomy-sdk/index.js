const request = require("./http");
const { GreenatomySdkError } = request;

class GreenatomyClient {
  constructor({ baseUrl, token, apiKey, timeout = 5000 } = {}) {
    if (!baseUrl || typeof baseUrl !== "string") {
      throw new TypeError("GreenatomyClient requires a valid baseUrl");
    }

    if (!token && !apiKey) {
      throw new TypeError("GreenatomyClient requires either a token or apiKey");
    }

    if (token && typeof token !== "string") {
      throw new TypeError("GreenatomyClient token must be a string");
    }

    if (apiKey && typeof apiKey !== "string") {
      throw new TypeError("GreenatomyClient apiKey must be a string");
    }

    if (typeof timeout !== "number" || Number.isNaN(timeout) || timeout <= 0) {
      throw new TypeError("GreenatomyClient timeout must be a positive number");
    }

    // Normalize the base URL once so request methods can append fixed endpoint paths safely.
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  async getLogs(params = {}) {
    // Pass query params through unchanged so the SDK mirrors the HTTP API surface.
    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/logs",
      params,
    });
  }

  async getStats(params = {}) {
    // Stats and summary reuse the same transport layer and auth configuration.
    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/logs/stats",
      params,
    });
  }

  async getSummary(params = {}) {
    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/logs/summary",
      params,
    });
  }
}

module.exports = GreenatomyClient;
module.exports.GreenatomySdkError = GreenatomySdkError;
