const prisma = require("../lib/prisma");
const { createAuthToken } = require("../utils/authTokens");
const { generateApiKey, hashApiKey, maskApiKey } = require("../utils/apiKeys");
const { hashPassword, verifyPassword } = require("../utils/passwords");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateCredentials({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || "");

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    const err = new Error("A valid email is required.");
    err.statusCode = 400;
    throw err;
  }

  if (normalizedPassword.length < 8) {
    const err = new Error("Password must be at least 8 characters.");
    err.statusCode = 400;
    throw err;
  }

  return {
    email: normalizedEmail,
    password: normalizedPassword,
  };
}

function serializeAuthPayload(user, project) {
  return {
    token: createAuthToken({
      sub: user.id,
      email: user.email,
      projectId: project?.id || null,
      role: "user",
    }),
    user: {
      id: user.id,
      email: user.email,
    },
    project: project
      ? {
          id: project.id,
          name: project.name,
        }
      : null,
  };
}

function buildStoredKeyPreview(apiKeyId) {
  return `stored:${String(apiKeyId).slice(0, 6)}`;
}

async function requireOwnedProject(userId, projectId) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  });

  if (!project) {
    const err = new Error("Project not found for this account.");
    err.statusCode = 404;
    throw err;
  }

  return project;
}

async function registerUser({ email, password, projectName }) {
  const credentials = validateCredentials({ email, password });
  const existingUser = await prisma.user.findUnique({
    where: { email: credentials.email },
  });

  if (existingUser) {
    const err = new Error("Email is already registered.");
    err.statusCode = 409;
    throw err;
  }

  const defaultProjectName = String(projectName || "").trim() || "Default project";
  const user = await prisma.user.create({
    data: {
      email: credentials.email,
      passwordHash: hashPassword(credentials.password),
      projects: {
        create: {
          name: defaultProjectName,
        },
      },
    },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return serializeAuthPayload(user, user.projects[0] || null);
}

async function loginUser({ email, password }) {
  const credentials = validateCredentials({ email, password });
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user || !verifyPassword(credentials.password, user.passwordHash)) {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    throw err;
  }

  return serializeAuthPayload(user, user.projects[0] || null);
}

async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    projects: user.projects.map((project) => ({
      id: project.id,
      name: project.name,
    })),
  };
}

async function createProjectForUser(userId, { name }) {
  const normalizedName = String(name || "").trim();

  if (!normalizedName) {
    const err = new Error("Project name is required.");
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  try {
    const project = await prisma.project.create({
      data: {
        userId,
        name: normalizedName,
      },
    });

    return {
      project: {
        id: project.id,
        name: project.name,
      },
    };
  } catch (err) {
    if (err?.code === "P2002") {
      const duplicateErr = new Error("Project name already exists.");
      duplicateErr.statusCode = 409;
      throw duplicateErr;
    }

    throw err;
  }
}

async function listProjectApiKeys(userId, projectId) {
  await requireOwnedProject(userId, projectId);

  const apiKeys = await prisma.apiKey.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return {
    apiKeys: apiKeys.map((apiKey) => ({
      id: apiKey.id,
      label: apiKey.label || "Unnamed key",
      createdAt: apiKey.createdAt,
      revokedAt: apiKey.revokedAt,
      preview: buildStoredKeyPreview(apiKey.id),
    })),
  };
}

async function createProjectApiKey(userId, projectId, { label }) {
  await requireOwnedProject(userId, projectId);

  const rawKey = generateApiKey();
  const apiKey = await prisma.apiKey.create({
    data: {
      projectId,
      keyHash: hashApiKey(rawKey),
      label: String(label || "").trim() || "SDK key",
    },
  });

  return {
    apiKey: {
      id: apiKey.id,
      label: apiKey.label || "SDK key",
      createdAt: apiKey.createdAt,
      revokedAt: apiKey.revokedAt,
      preview: maskApiKey(rawKey),
    },
    rawKey,
  };
}

async function revokeProjectApiKey(userId, projectId, keyId) {
  await requireOwnedProject(userId, projectId);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: keyId,
      projectId,
    },
  });

  if (!apiKey) {
    const err = new Error("API key not found.");
    err.statusCode = 404;
    throw err;
  }

  const revoked = await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      revokedAt: apiKey.revokedAt || new Date(),
    },
  });

  return {
    apiKey: {
      id: revoked.id,
      label: revoked.label || "Unnamed key",
      createdAt: revoked.createdAt,
      revokedAt: revoked.revokedAt,
      preview: buildStoredKeyPreview(revoked.id),
    },
  };
}

module.exports = {
  createProjectApiKey,
  registerUser,
  loginUser,
  getUserProfile,
  createProjectForUser,
  listProjectApiKeys,
  revokeProjectApiKey,
};
