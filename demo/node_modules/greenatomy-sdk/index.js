const request = require("./http");
const { GreenatomySdkError } = request;
const { greenatomyMiddleware, CostTracker } = require("./middleware");

class GreenatomyClient {
  constructor({
    baseUrl,
    token,
    apiKey,
    projectId,
    environment = "production",
    enabled = true,
    timeout = 5000,
  } = {}) {
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

    // Optional project grouping so one account can track multiple apps cleanly.
    if (projectId && typeof projectId !== "string") {
      throw new TypeError("GreenatomyClient projectId must be a string");
    }

    // Helps separate telemetry between local/dev/staging/prod dashboards.
    if (
      typeof environment !== "string" ||
      !["development", "staging", "production"].includes(environment)
    ) {
      throw new TypeError(
        "GreenatomyClient environment must be one of: development, staging, production"
      );
    }

    // Useful when developers want SDK installed but temporarily disabled.
    if (typeof enabled !== "boolean") {
      throw new TypeError("GreenatomyClient enabled must be a boolean");
    }

    if (typeof timeout !== "number" || Number.isNaN(timeout) || timeout <= 0) {
      throw new TypeError("GreenatomyClient timeout must be a positive number");
    }

    // Clean trailing slashes once here so request methods stay predictable.
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.environment = environment;
    this.enabled = enabled;
    this.timeout = timeout;
  }

  // Shared metadata gets attached automatically so backend can filter smarter.
  buildMeta(params = {}) {
    return {
      ...params,
      projectId: this.projectId,
      environment: this.environment,
    };
  }

  async getLogs(params = {}) {
    if (!this.enabled) return null;

    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/logs",
      params: this.buildMeta(params),
    });
  }

  async createLog(payload = {}) {
    if (!this.enabled) return null;

    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "POST",
      url: "/logs",
      data: {
        ...payload,
        projectId: this.projectId,
        environment: this.environment,
      },
    });
  }

  async getStats(params = {}) {
    if (!this.enabled) return null;

    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/logs/stats",
      params: this.buildMeta(params),
    });
  }

  async getSummary(params = {}) {
    if (!this.enabled) return null;

    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/logs/summary",
      params: this.buildMeta(params),
    });
  }

  // Returns external API spend broken down by provider or label.
  // groupBy: "provider" | "label" (default: "provider")
  // Example response: [{ provider: "openai", totalCostUsd, requestCount, avgCostPerRequest }]
  async getExternalBreakdown(params = {}) {
    if (!this.enabled) return null;

    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/logs/external-breakdown",
      params: this.buildMeta(params),
    });
  }

  // Quick sanity check so SDK users can confirm collector connectivity fast.
  async healthCheck() {
    if (!this.enabled) return null;

    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      apiKey: this.apiKey,
      timeout: this.timeout,
      method: "GET",
      url: "/health",
    });
  }
}

module.exports = GreenatomyClient;
module.exports.GreenatomySdkError = GreenatomySdkError;
module.exports.greenatomyMiddleware = greenatomyMiddleware;
module.exports.CostTracker = CostTracker;