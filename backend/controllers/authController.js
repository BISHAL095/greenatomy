const authService = require("../services/authService");

function getStatusCode(err) {
  return Number.isInteger(err.statusCode) ? err.statusCode : 500;
}

async function register(req, res) {
  try {
    const payload = await authService.registerUser(req.body || {});
    res.status(201).json(payload);
  } catch (err) {
    const statusCode = getStatusCode(err);
    res.status(statusCode).json({ error: statusCode === 500 ? "Registration failed" : err.message });
  }
}

async function login(req, res) {
  try {
    const payload = await authService.loginUser(req.body || {});
    res.json(payload);
  } catch (err) {
    const statusCode = getStatusCode(err);
    res.status(statusCode).json({ error: statusCode === 500 ? "Login failed" : err.message });
  }
}

async function me(req, res) {
  try {
    const payload = await authService.getUserProfile(req.auth.userId);
    res.json(payload);
  } catch (err) {
    const statusCode = getStatusCode(err);
    res.status(statusCode).json({ error: statusCode === 500 ? "Unable to load profile" : err.message });
  }
}

async function createProject(req, res) {
  try {
    const payload = await authService.createProjectForUser(req.auth.userId, req.body || {});
    res.status(201).json(payload);
  } catch (err) {
    const statusCode = getStatusCode(err);
    res.status(statusCode).json({ error: statusCode === 500 ? "Unable to create project" : err.message });
  }
}

async function listProjectKeys(req, res) {
  try {
    const payload = await authService.listProjectApiKeys(req.auth.userId, req.params.projectId);
    res.json(payload);
  } catch (err) {
    const statusCode = getStatusCode(err);
    res.status(statusCode).json({ error: statusCode === 500 ? "Unable to load API keys" : err.message });
  }
}

async function createProjectKey(req, res) {
  try {
    const payload = await authService.createProjectApiKey(
      req.auth.userId,
      req.params.projectId,
      req.body || {}
    );
    res.status(201).json(payload);
  } catch (err) {
    const statusCode = getStatusCode(err);
    res.status(statusCode).json({ error: statusCode === 500 ? "Unable to create API key" : err.message });
  }
}

async function revokeProjectKey(req, res) {
  try {
    const payload = await authService.revokeProjectApiKey(
      req.auth.userId,
      req.params.projectId,
      req.params.keyId
    );
    res.json(payload);
  } catch (err) {
    const statusCode = getStatusCode(err);
    res.status(statusCode).json({ error: statusCode === 500 ? "Unable to revoke API key" : err.message });
  }
}

module.exports = {
  register,
  login,
  me,
  createProject,
  listProjectKeys,
  createProjectKey,
  revokeProjectKey,
};
