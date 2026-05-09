const express = require("express");
const authController = require("../controllers/authController");
const userAuthMiddleware = require("../middlewares/userAuth");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", userAuthMiddleware, authController.me);
router.post("/projects", userAuthMiddleware, authController.createProject);
router.get("/projects/:projectId/keys", userAuthMiddleware, authController.listProjectKeys);
router.post("/projects/:projectId/keys", userAuthMiddleware, authController.createProjectKey);
router.post("/projects/:projectId/keys/:keyId/revoke", userAuthMiddleware, authController.revokeProjectKey);

module.exports = router;
