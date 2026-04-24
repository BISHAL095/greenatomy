const RANGE_TO_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Normalize dashboard filter state into concrete date bounds when possible.
export function getWindowRange(filters = {}) {
  if (filters.range === "all") {
    return { from: null, to: null, windowMs: null };
  }

  if (filters.range === "custom") {
    const from = filters.from ? new Date(filters.from) : null;
    const to = filters.to ? new Date(filters.to) : null;

    const hasValidFrom = !from || Number.isFinite(from.getTime());
    const hasValidTo = !to || Number.isFinite(to.getTime());

    if (hasValidFrom && hasValidTo) {
      if (from && to) {
        const diff = to.getTime() - from.getTime();
        if (diff > 0) {
          return { from, to, windowMs: diff };
        }
      } else if (from || to) {
        return { from, to, windowMs: null };
      }
    }
  }

  const windowMs = RANGE_TO_MS[filters.range] || RANGE_TO_MS["24h"];
  const to = new Date();
  const from = new Date(to.getTime() - windowMs);
  return { from, to, windowMs };
}

// Keep log-query serialization consistent across dashboard panels.
export function buildLogsSearchParams(filters = {}, options = {}) {
  const params = new URLSearchParams();
  const { from, to } = getWindowRange(filters);

  if (filters.method) {
    params.set("method", filters.method);
  }

  if (filters.path) {
    params.set("path", filters.path);
  }

  if (filters.range === "custom") {
    if (from) {
      params.set("from", from.toISOString());
    }

    if (to) {
      params.set("to", to.toISOString());
    }
  } else if (filters.range) {
    params.set("range", filters.range);
  }

  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  return params;
}
