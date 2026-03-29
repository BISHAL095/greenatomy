const express = require("express");
const logsRoute = require("./routes/logs");
const cors = require("cors");
const loggerMiddleware = require("./middlewares/estimator");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: true,
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
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

module.exports = app;
