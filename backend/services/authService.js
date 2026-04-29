const prisma = require("../lib/prisma");
const { createAuthToken } = require("../utils/authTokens");
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

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  createProjectForUser,
};
