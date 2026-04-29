const express = require("express");
const authRoute = require("./routes/auth");
const logsRoute = require("./routes/logs");
const cors = require("cors");
const authMiddleware = require("./middlewares/auth");
const { createRateLimitMiddleware } = require("./middlewares/rateLimit");
const env = require("./config/env");

// Express app bootstrap for telemetry APIs and demo routes.
const app = express();

function logServerEvent(message, meta = {}) {
  console.info(JSON.stringify({ level: "info", message, ...meta }));
}

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use("/auth", authRoute);

// Protect telemetry endpoints with token auth.
app.use(
  "/logs",
  createRateLimitMiddleware({
    windowMs: env.logsRateLimitWindowMs,
    maxRequests: env.logsRateLimitMaxRequests,
  }),
  authMiddleware,
  logsRoute
);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

if (env.nodeEnv !== "production") {
  // Keep demo routes available in development without exposing them in production.
  app.get("/test", (req, res) => {
    res.send("testing..");
  });

  app.get("/heavy", async (req, res) => {
    const delay = 3000;
    logServerEvent("Heavy route invoked", { path: req.path, delayMs: delay });

    setTimeout(() => {
      res.send("This response was delayed by 3 seconds.");
    }, delay);
  });
}

if (require.main === module) {
  app.listen(env.port, () => {
    logServerEvent("Server listening", { port: env.port, nodeEnv: env.nodeEnv });
  });
}

module.exports = app;
