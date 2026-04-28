const { verifyAuthToken } = require("../utils/authTokens");

function getBearerToken(header) {
  if (!header) return "";

  const [scheme, token] = String(header).split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return "";
  }

  return token.trim();
}

function userAuthMiddleware(req, res, next) {
  const token = getBearerToken(req.headers.authorization);
  const payload = verifyAuthToken(token);

  if (!payload?.sub) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.auth = {
    type: "user",
    userId: payload.sub,
    email: payload.email,
    projectId: payload.projectId || null,
  };

  next();
}

module.exports = userAuthMiddleware;
