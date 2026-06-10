require("dotenv").config();
const axios = require("axios");

const costs = [
  {
    provider: "openai",
    model: "gpt-4o",
    operation: "chat.completions",
    inputTokens: 1200,
    outputTokens: 800,
    costUsd: 0.045,
    latencyMs: 850,
    label: "Customer Support Bot",
  },
  {
    provider: "openai",
    model: "text-embedding-3-large",
    operation: "embeddings",
    inputTokens: 3500,
    costUsd: 0.018,
    latencyMs: 120,
    label: "Document Search",
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4",
    operation: "summarization",
    inputTokens: 5000,
    outputTokens: 1500,
    costUsd: 0.082,
    latencyMs: 1400,
    label: "Report Summary",
  },
  {
    provider: "anthropic",
    model: "claude-opus-4",
    operation: "analysis",
    inputTokens: 2500,
    outputTokens: 1200,
    costUsd: 0.115,
    latencyMs: 2100,
    label: "Financial Analysis",
  },
  {
    provider: "google",
    model: "gemini-2.5-pro",
    operation: "chat",
    inputTokens: 1800,
    outputTokens: 900,
    costUsd: 0.052,
    latencyMs: 950,
    label: "Knowledge Assistant",
  },
  {
    provider: "google",
    model: "gemini-embedding",
    operation: "embeddings",
    inputTokens: 4000,
    costUsd: 0.012,
    latencyMs: 140,
    label: "Vector Search",
  },
  {
    provider: "azure-openai",
    model: "gpt-4o",
    operation: "chat.completions",
    inputTokens: 2200,
    outputTokens: 1100,
    costUsd: 0.061,
    latencyMs: 1100,
    label: "Enterprise Chat",
  },
  {
    provider: "cohere",
    model: "command-r-plus",
    operation: "rerank",
    inputTokens: 3200,
    costUsd: 0.014,
    latencyMs: 180,
    label: "Search Reranking",
  },
  {
    provider: "mistral",
    model: "mistral-large",
    operation: "chat",
    inputTokens: 1700,
    outputTokens: 700,
    costUsd: 0.026,
    latencyMs: 620,
    label: "Internal Assistant",
  },
  {
    provider: "perplexity",
    model: "sonar-pro",
    operation: "research",
    inputTokens: 2800,
    outputTokens: 1300,
    costUsd: 0.034,
    latencyMs: 1700,
    label: "Web Research",
  },
  {
    provider: "openai",
    model: "gpt-4.1",
    operation: "code-generation",
    inputTokens: 3000,
    outputTokens: 2000,
    costUsd: 0.089,
    latencyMs: 1900,
    label: "Code Assistant",
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4",
    operation: "classification",
    inputTokens: 1000,
    outputTokens: 100,
    costUsd: 0.009,
    latencyMs: 240,
    label: "Intent Detection",
  },
  {
    provider: "google",
    model: "gemini-2.5-flash",
    operation: "summarization",
    inputTokens: 2200,
    outputTokens: 600,
    costUsd: 0.017,
    latencyMs: 420,
    label: "Quick Summary",
  },
  {
    provider: "azure-openai",
    model: "gpt-4o-mini",
    operation: "translation",
    inputTokens: 1500,
    outputTokens: 900,
    costUsd: 0.013,
    latencyMs: 350,
    label: "Translation Service",
  },
  {
    provider: "openai",
    model: "whisper-1",
    operation: "transcription",
    costUsd: 0.011,
    latencyMs: 780,
    label: "Audio Processing",
  },
];

async function seed() {
  const totalExternalCostUsd = costs.reduce(
    (sum, cost) => sum + cost.costUsd,
    0
  );
  console.log("BASE URL:", process.env.GREENATOMY_BASE_URL);
console.log("API KEY:", process.env.GREENATOMY_API_KEY);
  await axios.post(
    `${process.env.GREENATOMY_BASE_URL}/logs`,
    {
      method: "POST",
      path: "/seed/external-costs",
      statusCode: 200,
      durationMs: 1200,
      cpuUsedMs: 42,
      memoryDeltaMb: 8,
      ioBytes: 0,
      networkBytes: 4096,
      provider: "aws",
      region: "ap-south-1",
      environment: "production",
      totalExternalCostUsd,
      externalCosts: costs,
    },
    {
      headers: {
        "x-api-key": process.env.GREENATOMY_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(`Inserted ${costs.length} external cost records`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.response?.data || err.message);
    process.exit(1);
  });