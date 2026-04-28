const env = require("../config/env");
const { verifyAuthToken } = require("../utils/authTokens");

// Extract Bearer token from Authorization header.
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

  // Support both standard bearer auth and API-key style auth for simple clients.
  const bearerToken = getBearerToken(req.headers.authorization);
  const apiKeyToken = typeof req.headers["x-api-key"] === "string" ? req.headers["x-api-key"].trim() : "";
  const token = bearerToken || apiKeyToken;

  if (token && token === env.authToken) {
    req.auth = { type: "system" };
    next();
    return;
  }

  const payload = verifyAuthToken(token);
  if (payload?.sub) {
    req.auth = {
      type: "user",
      userId: payload.sub,
      email: payload.email,
      projectId: payload.projectId || null,
    };
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

module.exports = authMiddleware;
