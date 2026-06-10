require("dotenv").config();

const express = require("express");
const GreenatomyClient = require("greenatomy-sdk");
const { greenatomyMiddleware } = GreenatomyClient;

const {
  GREENATOMY_BASE_URL,
  GREENATOMY_API_KEY,
  GREENATOMY_TOKEN,
  GREENATOMY_PROVIDER = "generic",
  GREENATOMY_REGION = "global",
  GREENATOMY_ENVIRONMENT = "production",
  DEMO_PORT = 4100,
} = process.env;

if (!GREENATOMY_BASE_URL) {
  console.error("Missing GREENATOMY_BASE_URL in .env or environment");
  process.exit(1);
}

if (!GREENATOMY_API_KEY && !GREENATOMY_TOKEN) {
  console.error("Missing GREENATOMY_API_KEY or GREENATOMY_TOKEN in .env or environment");
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use(
  greenatomyMiddleware({
    baseUrl: GREENATOMY_BASE_URL,
    apiKey: GREENATOMY_API_KEY,
    token: GREENATOMY_TOKEN,
    environment: GREENATOMY_ENVIRONMENT,
    provider: GREENATOMY_PROVIDER,
    region: GREENATOMY_REGION,
    shouldTrack: (req) => req.method !== "OPTIONS" && req.path !== "/health",
    onError: (error) => {
      console.error("[greenatomy] telemetry submit failed:", error.message);
    },
  })
);

function trackCosts(res, costs) {
  if (!res.locals?.greenatomy || typeof res.locals.greenatomy.trackCost !== "function") {
    return;
  }

  for (const cost of costs) {
    res.locals.greenatomy.trackCost(cost);
  }
}

app.get("/", (req, res) => {
  res.send({ message: "Welcome to the Greenatomy demo app." });
});

app.get("/users", (req, res) => {
  res.send({ users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] });
});

app.get("/heavy", (req, res) => {
  let total = 0;
  for (let i = 0; i < 8_000_000; i += 1) {
    total += i;
  }

  res.send({ message: "Heavy computation finished.", total });
});

app.get("/error", (req, res) => {
  res.status(503).send({ error: "Simulated failure" });
});

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.post("/api/chat", (req, res) => {
  trackCosts(res, [
    {
      provider: "openai",
      model: "gpt-4o-mini",
      operation: "chat.completions",
      inputTokens: 32,
      outputTokens: 128,
      costUsd: 0.0065,
      latencyMs: 182,
      label: "OpenAI chat",
    },
    {
      provider: "google",
      model: "gemini-pro",
      operation: "chat",
      inputTokens: 24,
      outputTokens: 76,
      costUsd: 0.0072,
      latencyMs: 210,
      label: "Google Gemini chat",
    },
  ]);

  res.send({ ok: true, route: "chat" });
});

app.post("/api/checkout", (req, res) => {
  trackCosts(res, [
    {
      provider: "azure-openai",
      model: "gpt-4o-mini",
      operation: "completions",
      inputTokens: 18,
      outputTokens: 60,
      costUsd: 0.0056,
      latencyMs: 198,
      label: "Azure OpenAI checkout",
    },
    {
      provider: "anthropic",
      model: "claude-3.5",
      operation: "intent-classification",
      inputTokens: 14,
      outputTokens: 18,
      costUsd: 0.0014,
      latencyMs: 115,
      label: "Claude intent classification",
    },
  ]);

  res.send({ ok: true, route: "checkout" });
});

app.post("/api/post", (req, res) => {
  trackCosts(res, [
    {
      provider: "openai",
      model: "text-embedding-3-large",
      operation: "embeddings",
      inputTokens: 64,
      outputTokens: null,
      costUsd: 0.0064,
      latencyMs: 145,
      label: "OpenAI embeddings",
    },
    {
      provider: "google",
      model: "gemini-embed",
      operation: "embeddings",
      inputTokens: 52,
      outputTokens: null,
      costUsd: 0.0052,
      latencyMs: 170,
      label: "Google embeddings",
    },
  ]);

  res.send({ ok: true, route: "post" });
});

app.post("/api/summarize", (req, res) => {
  trackCosts(res, [
    {
      provider: "anthropic",
      model: "claude-3.5",
      operation: "summarize",
      inputTokens: 44,
      outputTokens: 96,
      costUsd: 0.0098,
      latencyMs: 230,
      label: "Claude summarization",
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
      operation: "summarize",
      inputTokens: 48,
      outputTokens: 88,
      costUsd: 0.0112,
      latencyMs: 195,
      label: "OpenAI summarize",
    },
  ]);

  res.send({ ok: true, route: "summarize" });
});

app.post("/api/external", (req, res) => {
  trackCosts(res, [
    {
      provider: "anthropic",
      model: "claude-3.5",
      operation: "batch-summarize",
      inputTokens: 120,
      outputTokens: 212,
      costUsd: 0.0214,
      latencyMs: 342,
      label: "Claude batch summarize",
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
      operation: "analysis",
      inputTokens: 80,
      outputTokens: 120,
      costUsd: 0.0148,
      latencyMs: 280,
      label: "OpenAI analysis",
    },
    {
      provider: "google",
      model: "gemini-pro",
      operation: "text-analysis",
      inputTokens: 78,
      outputTokens: 96,
      costUsd: 0.0122,
      latencyMs: 310,
      label: "Google text analysis",
    },
  ]);

  res.send({ ok: true, route: "external" });
});

app.listen(DEMO_PORT, () => {
  console.log(`Greenatomy demo listening on http://localhost:${DEMO_PORT}`);
  console.log("Using Greenatomy base URL:", GREENATOMY_BASE_URL);
});
