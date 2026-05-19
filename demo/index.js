require("dotenv").config();

const express = require("express");
const GreenatomyClient = require("../greenatomy-sdk");

const { greenatomyMiddleware } = GreenatomyClient;

function readConfig() {
  const baseUrl = process.env.GREENATOMY_BASE_URL || "http://localhost:5000";
  const token = process.env.GREENATOMY_TOKEN || "";
  const apiKey = process.env.GREENATOMY_API_KEY || "";
  const port = Number(process.env.DEMO_PORT || 4100);
  const provider = process.env.GREENATOMY_PROVIDER || "generic";
  const region = process.env.GREENATOMY_REGION || "global";

  if (!token && !apiKey) {
    throw new Error(
      "Set GREENATOMY_TOKEN or GREENATOMY_API_KEY before running the demo."
    );
  }

  return {
    baseUrl,
    token: token || undefined,
    apiKey: apiKey || undefined,
    port,
    provider,
    region,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = readConfig();
  const app = express();

  app.use(express.json());
  app.use(
    greenatomyMiddleware({
      baseUrl: config.baseUrl,
      token: config.token,
      apiKey: config.apiKey,
      provider: config.provider,
      region: config.region,
      shouldTrack(req) {
        return req.method !== "OPTIONS" && req.path !== "/health";
      },
      onError(error) {
        console.error("[greenatomy-demo] telemetry failed:", error.message);
      },
    })
  );

  app.get("/", (req, res) => {
    res.json({
      ok: true,
      message: "Greenatomy demo is running.",
      routes: ["/", "/users", "/heavy", "/error", "/health"],
    });
  });

  app.get("/users", (req, res) => {
    res.json({
      users: [
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ],
    });
  });

  app.get("/heavy", async (req, res) => {
    await wait(180);
    res.json({
      ok: true,
      durationHintMs: 180,
    });
  });

  app.get("/error", (req, res) => {
    res.status(503).json({
      error: "Synthetic upstream failure",
    });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(config.port, () => {
    console.log(`\nGreenatomy demo app listening on http://localhost:${config.port}`);
    console.log(`Collector: ${config.baseUrl}`);
    console.log(`Energy model: provider=${config.provider}, region=${config.region}`);
    console.log("Tracked demo routes:");
    console.log("  GET /");
    console.log("  GET /users");
    console.log("  GET /heavy");
    console.log("  GET /error");
    console.log("\nFire a few requests, then open the dashboard to see telemetry.\n");
  });
}

main().catch((error) => {
  console.error("\nDemo failed\n");

  if (error && typeof error === "object") {
    console.error({
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
  } else {
    console.error(error);
  }

  process.exit(1);
});
