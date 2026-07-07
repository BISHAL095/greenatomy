const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const ALLOWED_ENVIRONMENTS = new Set([
  "development",
  "staging",
  "production",
]);

const RANGE_TO_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Normalize HTTP methods so downstream filters can assume canonical uppercase input.
function normalizeMethod(method) {
  if (!method) return undefined;

  const normalized = String(method).trim().toUpperCase();
  if (!normalized) return undefined;

  if (!ALLOWED_METHODS.has(normalized)) {
    const err = new Error("Invalid method filter.");
    err.statusCode = 400;
    throw err;
  }

  return normalized;
}

function normalizePath(path) {
  if (!path) return undefined;

  // Preserve partial-path matching while rejecting empty-string filters.
  const normalized = String(path).trim();

  return normalized || undefined;
}

function normalizeProjectId(projectId) {
  if (!projectId) return undefined;

  const normalized = String(projectId).trim();

  return normalized || undefined;
}

function normalizeOptionalText(value) {
  if (!value) return undefined;

  const normalized = String(value).trim().toLowerCase();

  return normalized || undefined;
}

// Keep environments standardized so analytics don't split on typos or casing.
function normalizeEnvironment(environment) {
  if (!environment) return undefined;

  const normalized = String(environment).trim().toLowerCase();

  if (!normalized) return undefined;

  if (!ALLOWED_ENVIRONMENTS.has(normalized)) {
    const err = new Error(
      "environment must be one of: development, staging, production."
    );
    err.statusCode = 400;
    throw err;
  }

  return normalized;
}

function normalizeOptionalInteger(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    const err = new Error(
      `${fieldName} must be a non-negative integer.`
    );
    err.statusCode = 400;
    throw err;
  }

  return parsed;
}

function normalizeOptionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    const err = new Error(
      `${fieldName} must be a non-negative number.`
    );
    err.statusCode = 400;
    throw err;
  }

  return parsed;
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null || limit === "") {
    // Default to a dashboard-friendly page size when the client omits `limit`.
    return 50;
  }

  const parsed = Number.parseInt(String(limit), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    const err = new Error("limit must be a positive integer.");
    err.statusCode = 400;
    throw err;
  }

  // Prevent unbounded fetches from overwhelming the logs endpoint.
  return Math.min(parsed, 200);
}

// Parse date-like input into a valid Date object or surface a 400 validation error.
function parseDate(value, fieldName) {
  if (!value) return undefined;

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    const err = new Error(
      `${fieldName} must be a valid date/time.`
    );
    err.statusCode = 400;
    throw err;
  }

  return parsed;
}

function normalizeRange(range) {
  if (!range) return "24h";

  const normalized = String(range).trim().toLowerCase();

  if (normalized === "all") return "all";
  if (RANGE_TO_MS[normalized]) return normalized;

  const err = new Error(
    "range must be one of: 24h, 7d, 30d, all."
  );
  err.statusCode = 400;
  throw err;
}

// Build a `createdAt` window from either explicit dates or a named relative range.
function normalizeTimeWindow(query) {
  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");

  if (from || to) {
    // Allow one-sided ranges by filling the missing boundary with a sensible default.
    const gte = from || new Date(0);
    const lte = to || new Date();

    if (gte > lte) {
      const err = new Error(
        "from must be less than or equal to to."
      );
      err.statusCode = 400;
      throw err;
    }

    return {
      createdAt: { gte, lte },
      range: "custom",
    };
  }

  const range = normalizeRange(query.range);

  if (range === "all") {
    return {
      // `undefined` tells Prisma not to apply a `createdAt` filter at all.
      createdAt: undefined,
      range,
    };
  }

  const now = new Date();
  const gte = new Date(now.getTime() - RANGE_TO_MS[range]);

  return {
    createdAt: { gte, lte: now },
    range,
  };
}

function validateLogsQuery(query) {
  // Logs support result limits in addition to the shared filter fields.
  const timeWindow = normalizeTimeWindow(query);

  return {
    limit: normalizeLimit(query.limit),
    method: normalizeMethod(query.method),
    path: normalizePath(query.path),
    projectId: normalizeProjectId(query.projectId),
    environment: normalizeEnvironment(query.environment),
    createdAt: timeWindow.createdAt,
    range: timeWindow.range,
  };
}

function validateStatsQuery(query) {
  // Aggregate endpoints do not need pagination limits.
  const timeWindow = normalizeTimeWindow(query);

  return {
    method: normalizeMethod(query.method),
    path: normalizePath(query.path),
    projectId: normalizeProjectId(query.projectId),
    environment: normalizeEnvironment(query.environment),
    createdAt: timeWindow.createdAt,
    range: timeWindow.range,
  };
}

function validateCreateLogBody(body) {
  const method = normalizeMethod(body.method);
  const path = normalizePath(body.path);
  const durationMs = normalizeOptionalInteger(
    body.durationMs,
    "durationMs"
  );
  const cpuUsedMs = normalizeOptionalNumber(
    body.cpuUsedMs,
    "cpuUsedMs"
  );
  const memoryDeltaMb = normalizeOptionalNumber(
    body.memoryDeltaMb,
    "memoryDeltaMb"
  );
  const ioBytes = normalizeOptionalNumber(
    body.ioBytes,
    "ioBytes"
  );
  const networkBytes = normalizeOptionalNumber(
    body.networkBytes,
    "networkBytes"
  );
  const statusCode = normalizeOptionalInteger(
    body.statusCode,
    "statusCode"
  );
  const createdAt = parseDate(body.createdAt, "createdAt");

  // Defaults safely to production if SDK/client doesn't explicitly tag environment.
  const environment =
    normalizeEnvironment(body.environment) || "production";

  if (!method) {
    const err = new Error("method is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!path) {
    const err = new Error("path is required.");
    err.statusCode = 400;
    throw err;
  }

  if (durationMs === undefined) {
    const err = new Error("durationMs is required.");
    err.statusCode = 400;
    throw err;
  }

  const totalExternalCostUsd = normalizeOptionalNumber(
    body.totalExternalCostUsd,
    "totalExternalCostUsd"
  );

  const externalCosts = Array.isArray(body.externalCosts)
    ? body.externalCosts
    : [];

  return {
    projectId: normalizeProjectId(body.projectId),
    environment,
    method,
    path,
    statusCode,
    durationMs,
    cpuUsedMs: cpuUsedMs ?? 0,
    memoryDeltaMb: memoryDeltaMb ?? 0,
    ioBytes: ioBytes ?? 0,
    networkBytes: networkBytes ?? 0,
    provider: normalizeOptionalText(body.provider),
    region: normalizeOptionalText(body.region),
    createdAt,

    totalExternalCostUsd,
    externalCosts,
  };
}

function validateExternalBreakdownQuery(query) {
  const timeWindow = normalizeTimeWindow(query);

  return {
    groupBy: ["provider", "label"].includes(query.groupBy)
      ? query.groupBy
      : "provider",
    projectId: normalizeProjectId(query.projectId),
    environment: normalizeEnvironment(query.environment),
    createdAt: timeWindow.createdAt,
    range: timeWindow.range,
  };
}

module.exports = {
  validateCreateLogBody,
  validateLogsQuery,
  validateStatsQuery,
  validateExternalBreakdownQuery
};
