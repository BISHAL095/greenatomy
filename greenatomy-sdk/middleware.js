const request = require("./http");

function defaultShouldTrack(req) {
  return req?.method !== "OPTIONS";
}

// Normalize route source in priority order.
// `req.route.path` gives cleaner route templates like /users/:id when available.
function getRequestPath(req) {
  if (req?.route?.path) {
    return req.route.path;
  }

  return req?.originalUrl || req?.url || req?.path || "/";
}

function normalizeEnvironment(environment) {
  if (!environment) {
    return "production";
  }

  const normalized = String(environment).trim().toLowerCase();

  if (
    normalized !== "development" &&
    normalized !== "staging" &&
    normalized !== "production"
  ) {
    return "production";
  }

  return normalized;
}

function toDurationMs(startNs) {
  if (typeof process.hrtime?.bigint === "function") {
    return Number((process.hrtime.bigint() - startNs) / 1000000n);
  }

  return 0;
}

function greenatomyMiddleware({
  shouldTrack = defaultShouldTrack,
  onError,
  baseUrl,
  token,
  apiKey,
  timeout = 5000,
  // Allows apps to explicitly separate dev/staging/prod traffic.
  environment = process.env.NODE_ENV || "production",
} = {}) {
  if (!baseUrl || typeof baseUrl !== "string") {
    throw new TypeError(
      "greenatomyMiddleware requires a valid baseUrl"
    );
  }

  if (!token && !apiKey) {
    throw new TypeError(
      "greenatomyMiddleware requires either a token or apiKey"
    );
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedEnvironment = normalizeEnvironment(environment);

  return function greenatomyRouteTelemetry(req, res, next) {
    if (!shouldTrack(req, res)) {
      next();
      return;
    }

    const startedAt = new Date();
    const startNs = process.hrtime.bigint();
    let submitted = false;

    function submitTelemetry() {
      if (submitted) {
        return;
      }

      submitted = true;

      request({
        baseUrl: normalizedBaseUrl,
        token,
        apiKey,
        timeout,
        method: "POST",
        url: "/logs",
        data: {
          method: req.method,
          path: getRequestPath(req),
          statusCode: res.statusCode,
          durationMs: Math.max(0, toDurationMs(startNs)),
          cpuUsedMs: 0,
          createdAt: startedAt.toISOString(),
          environment: normalizedEnvironment,
        },
      }).catch((error) => {
        // Telemetry should never break host app execution.
        if (typeof onError === "function") {
          onError(error, req, res);
        }
      });
    }

    // `finish` handles successful responses, `close` catches aborted ones.
    res.once("finish", submitTelemetry);
    res.once("close", submitTelemetry);

    next();
  };
}

module.exports = {
  greenatomyMiddleware,
};