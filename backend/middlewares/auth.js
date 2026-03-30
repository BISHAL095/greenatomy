const env = require("../config/env");

function getBearerToken(header) {
  if (!header) return "";

  const [scheme, token] = String(header).split(" ");
  if (!scheme || !token) return "";
  if (scheme.toLowerCase() !== "bearer") return "";

  return token.trim();
}

function authMiddleware(req, res, next) {
  if (!env.authToken) {
    res.status(500).json({ error: "AUTH_TOKEN is not configured" });
    return;
  }

  const bearerToken = getBearerToken(req.headers.authorization);
  const apiKeyToken = typeof req.headers["x-api-key"] === "string" ? req.headers["x-api-key"].trim() : "";
  const token = bearerToken || apiKeyToken;

  if (!token || token !== env.authToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

module.exports = authMiddleware;
