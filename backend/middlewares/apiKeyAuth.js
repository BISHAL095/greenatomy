const prisma = require("../lib/prisma");
const { hashApiKey } = require("../utils/apiKeys");

async function apiKeyAuthMiddleware(req, res, next) {
  const rawKey = typeof req.headers["x-api-key"] === "string" ? req.headers["x-api-key"].trim() : "";

  if (!rawKey) {
    res.status(401).json({ error: "API key is required." });
    return;
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!apiKey?.project) {
    res.status(401).json({ error: "Invalid API key." });
    return;
  }

  req.auth = {
    type: "apiKey",
    apiKeyId: apiKey.id,
    projectId: apiKey.project.id,
    userId: apiKey.project.userId,
  };

  next();
}

module.exports = apiKeyAuthMiddleware;
