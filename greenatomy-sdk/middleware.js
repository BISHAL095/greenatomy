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

function toCpuUsedMs(startCpu) {
  const cpuDiff = process.cpuUsage(startCpu);

  return (cpuDiff.user + cpuDiff.system) / 1000;
}

function getSocketMetric(req, metric) {
  const value = req?.socket?.[metric];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// Accumulates external API cost annotations for a single request.
// Attached to res.locals.greenatomy by the middleware so route handlers
// can call tracker.trackCost() without importing anything extra.
class CostTracker {
  constructor() {
    this._costs = [];
  }

  trackCost({
    provider,
    model,
    operation,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd,
    latencyMs,
    label,
  }) {
    if (typeof costUsd !== "number" || !Number.isFinite(costUsd) || costUsd < 0) {
      console.warn(
        "[greenatomy] trackCost: costUsd must be a non-negative finite number, skipping"
      );
      return;
    }

    if (!provider || !operation) {
      console.warn(
        "[greenatomy] trackCost: provider and operation are required, skipping"
      );
      return;
    }

    this._costs.push({
      provider,
      model:        model        ?? null,
      operation,
      inputTokens:  inputTokens  ?? null,
      outputTokens: outputTokens ?? null,
      // Derive totalTokens if not supplied but components are available.
      totalTokens:
        totalTokens != null
          ? totalTokens
          : inputTokens != null && outputTokens != null
          ? inputTokens + outputTokens
          : null,
      costUsd,
      latencyMs: latencyMs ?? null,
      label:     label     ?? null,
    });
  }

  // Empties and returns the accumulated cost records.
  // Called once by submitTelemetry — draining prevents double-submission
  // if finish and close both fire (aborted keep-alive connections).
  _drain() {
    return this._costs.splice(0);
  }

  get totalCostUsd() {
    return this._costs.reduce((sum, c) => sum + c.costUsd, 0);
  }
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
  provider,
  region,
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

    // Attach a per-request tracker so route handlers can annotate external costs:
    //   res.locals.greenatomy.trackCost({ provider, operation, costUsd, ... })
    const tracker = new CostTracker();
    res.locals = res.locals || {};
    res.locals.greenatomy = tracker;

    const startedAt = new Date();
    const startNs = process.hrtime.bigint();
    const startCpu = process.cpuUsage();
    const startMemoryMb = process.memoryUsage().rss / 1024 / 1024;
    const startBytesRead = getSocketMetric(req, "bytesRead");
    const startBytesWritten = getSocketMetric(req, "bytesWritten");
    let submitted = false;

    function submitTelemetry() {
      if (submitted) {
        return;
      }

      submitted = true;

      const memoryDeltaMb = Math.max(
        0,
        process.memoryUsage().rss / 1024 / 1024 - startMemoryMb
      );
      const networkBytes = Math.max(
        0,
        getSocketMetric(req, "bytesRead") -
          startBytesRead +
          getSocketMetric(req, "bytesWritten") -
          startBytesWritten
      );

      // Drain before the async request — finish and close can both fire on
      // aborted keep-alive connections, and submitted guards the outer call,
      // but draining here is an extra safety net against double-sending costs.
      const externalCosts = tracker._drain();
      const totalExternalCostUsd = externalCosts.reduce(
        (sum, c) => sum + c.costUsd,
        0
      );

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
          cpuUsedMs: toCpuUsedMs(startCpu),
          memoryDeltaMb,
          ioBytes: 0,
          networkBytes,
          provider,
          region,
          createdAt: startedAt.toISOString(),
          environment: normalizedEnvironment,
          // External API cost attribution — omit the field entirely when empty
          // so existing backend validators that don't know about it are unaffected.
          ...(externalCosts.length > 0 && {
            externalCosts,
            totalExternalCostUsd,
          }),
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
  CostTracker,
};
