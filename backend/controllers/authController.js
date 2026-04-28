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

module.exports = {
  register,
  login,
  me,
};
