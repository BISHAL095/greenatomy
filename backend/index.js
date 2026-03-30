const express = require("express");
const logsRoute = require("./routes/logs");
const cors = require("cors");
const loggerMiddleware = require("./middlewares/estimator");
const env = require("./config/env");

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

app.use(loggerMiddleware);
app.use("/logs", logsRoute);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/test", (req, res) => {
  res.send("testing..");
});

app.get("/heavy", async (req, res) => {
  console.log("Request received, starting delay...");

  const delay = 3000;

  setTimeout(() => {
    res.send("This response was delayed by 3 seconds.");
  }, delay);
});

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Example app listening on port ${env.port}`);
  });
}

module.exports = app;
