const GreenatomyClient = require("../greenatomy-sdk");

function readConfig() {
  const baseUrl = process.env.GREENATOMY_BASE_URL || "http://localhost:5000";
  const token = process.env.GREENATOMY_TOKEN || "";
  const apiKey = process.env.GREENATOMY_API_KEY || "";
  const range = process.env.GREENATOMY_RANGE || "24h";
  const timeout = Number(process.env.GREENATOMY_TIMEOUT || 5000);

  if (!token && !apiKey) {
    throw new Error(
      "Set GREENATOMY_TOKEN or GREENATOMY_API_KEY before running the demo."
    );
  }

  return {
    baseUrl,
    token: token || undefined,
    apiKey: apiKey || undefined,
    range,
    timeout,
  };
}

async function main() {
  const config = readConfig();

  const client = new GreenatomyClient({
    baseUrl: config.baseUrl,
    token: config.token,
    apiKey: config.apiKey,
    timeout: config.timeout,
  });

  const summary = await client.getSummary({ range: config.range });
  const stats = await client.getStats({ range: config.range });

  console.log("\nGreenatomy Report\n");

  console.log("Stats:");
  console.table([
    {
      Requests: stats.totalRequests,
      "Avg Latency (ms)": Number(stats.avgDurationMs).toFixed(2),
      "Energy (kWh)": Number(stats.totalEnergyKwh).toFixed(6),
      "Cost (INR)": Number(stats.totalCost).toFixed(6),
    },
  ]);

  if (summary?.topCostRoute) {
    console.log("\nTop Route (by cost):");
    console.table([
      {
        Route: summary.topCostRoute.route,
        Hits: summary.topCostRoute.hits,
        "Total Cost (INR)": Number(summary.topCostRoute.totalCost).toFixed(6),
      },
    ]);
  }

  if (summary?.topSlowRoute) {
    console.log("\nSlowest Route:");
    console.table([
      {
        Route: summary.topSlowRoute.route,
        "Avg Latency (ms)": Number(summary.topSlowRoute.avgDurationMs).toFixed(0),
        Hits: summary.topSlowRoute.hits,
      },
    ]);
  }

  if (summary?.recommendations?.length) {
    console.log("\nRecommendations:");
    for (const item of summary.recommendations) {
      console.log(`- ${item}`);
    }
  }
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
