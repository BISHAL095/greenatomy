const express = require("express");
const authController = require("../controllers/authController");
const userAuthMiddleware = require("../middlewares/userAuth");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", userAuthMiddleware, authController.me);

module.exports = router;
