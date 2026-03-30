const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

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

function validateLogsQuery(query) {
  return {
    limit: normalizeLimit(query.limit),
    method: normalizeMethod(query.method),
    path: normalizePath(query.path),
  };
}

function validateStatsQuery(query) {
  return {
    method: normalizeMethod(query.method),
    path: normalizePath(query.path),
  };
}

module.exports = {
  validateLogsQuery,
  validateStatsQuery,
};
