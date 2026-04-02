function getClientKey(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function createRateLimitMiddleware({ windowMs, maxRequests }) {
  const hits = new Map();

  return function rateLimitMiddleware(req, res, next) {
    if (!Number.isFinite(windowMs) || windowMs <= 0 || !Number.isFinite(maxRequests) || maxRequests <= 0) {
      next();
      return;
    }

    const now = Date.now();
    const key = getClientKey(req);
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds,
      });
      return;
    }

    current.count += 1;
    next();
  };
}

module.exports = {
  createRateLimitMiddleware,
};
