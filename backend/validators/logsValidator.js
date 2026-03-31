const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const RANGE_TO_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Validate and normalize method filter into canonical uppercase form.
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

  const normalized = String(path).trim();
  return normalized || undefined;
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null || limit === "") {
    return 50;
  }

  const parsed = Number.parseInt(String(limit), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    const err = new Error("limit must be a positive integer.");
    err.statusCode = 400;
    throw err;
  }

  return Math.min(parsed, 200);
}

// Parse date-like input into a valid Date object or throw a 400 error.
function parseDate(value, fieldName) {
  if (!value) return undefined;

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    const err = new Error(`${fieldName} must be a valid date/time.`);
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

  const err = new Error("range must be one of: 24h, 7d, 30d, all.");
  err.statusCode = 400;
  throw err;
}

// Resolve either custom from/to window or preset range window.
function normalizeTimeWindow(query) {
  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");

  if (from || to) {
    const gte = from || new Date(0);
    const lte = to || new Date();

    if (gte > lte) {
      const err = new Error("from must be less than or equal to to.");
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
  const timeWindow = normalizeTimeWindow(query);

  return {
    limit: normalizeLimit(query.limit),
    method: normalizeMethod(query.method),
    path: normalizePath(query.path),
    createdAt: timeWindow.createdAt,
    range: timeWindow.range,
  };
}

function validateStatsQuery(query) {
  const timeWindow = normalizeTimeWindow(query);

  return {
    method: normalizeMethod(query.method),
    path: normalizePath(query.path),
    createdAt: timeWindow.createdAt,
    range: timeWindow.range,
  };
}

module.exports = {
  validateLogsQuery,
  validateStatsQuery,
};
