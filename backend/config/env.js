require("dotenv").config();

const port = Number(process.env.PORT);
const rawCorsOrigin = process.env.CORS_ORIGIN;
const rateLimitWindowMs = Number(process.env.LOGS_RATE_LIMIT_WINDOW_MS);
const rateLimitMaxRequests = Number(process.env.LOGS_RATE_LIMIT_MAX_REQUESTS);
const authTokenTtlSeconds = Number(process.env.AUTH_TOKEN_TTL_SECONDS);

function parseCorsOrigin(value) {
  // true allows any origin in development; string/array is used in stricter deployments.
  if (!value || value === "*") {
    return true;
  }

  if (!value.includes(",")) {
    return value;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.isFinite(port) && port > 0 ? port : 3000,
  corsOrigin: parseCorsOrigin(rawCorsOrigin),
  authToken: process.env.AUTH_TOKEN || "",
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN || "",
  authTokenTtlSeconds:
    Number.isFinite(authTokenTtlSeconds) && authTokenTtlSeconds > 0
      ? authTokenTtlSeconds
      : 7 * 24 * 60 * 60,
  logsRateLimitWindowMs:
    Number.isFinite(rateLimitWindowMs) && rateLimitWindowMs > 0 ? rateLimitWindowMs : 60_000,
  logsRateLimitMaxRequests:
    Number.isFinite(rateLimitMaxRequests) && rateLimitMaxRequests > 0 ? rateLimitMaxRequests : 60,
};
