const request = require("./http");

function defaultShouldTrack(req) {
  return req?.method !== "OPTIONS";
}

function getRequestPath(req) {
  return req?.originalUrl || req?.url || req?.path || "/";
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
} = {}) {
  if (!baseUrl || typeof baseUrl !== "string") {
    throw new TypeError("greenatomyMiddleware requires a valid baseUrl");
  }

  if (!token && !apiKey) {
    throw new TypeError("greenatomyMiddleware requires either a token or apiKey");
  }

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
        baseUrl: baseUrl.replace(/\/+$/, ""),
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
        },
      })
        .catch((error) => {
          if (typeof onError === "function") {
            onError(error, req, res);
          }
        });
    }

    res.once("finish", submitTelemetry);
    res.once("close", submitTelemetry);
    next();
  };
}

module.exports = {
  greenatomyMiddleware,
};
