// seed.js — generates realistic telemetry data for dashboard demos
// Usage: node seed.js
// Optional env: DEMO_PORT, SEED_COUNT, SEED_CONCURRENCY

require("dotenv").config();

const axios = require("axios");

const PORT = process.env.DEMO_PORT || 4100;
const BASE = `http://localhost:${PORT}`;
const COUNT = Number(process.env.SEED_COUNT || 200);
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY || 10);

const ROUTES = [
  { method: "post", url: "/api/chat",      weight: 5 },
  { method: "post", url: "/api/checkout",  weight: 3 },
  { method: "post", url: "/api/post",      weight: 4 },
  { method: "post", url: "/api/summarize", weight: 3 },
  { method: "post", url: "/api/external",  weight: 4 },
  { method: "get",  url: "/users",         weight: 6 },
  { method: "get",  url: "/heavy",         weight: 2 },
  { method: "get",  url: "/error",         weight: 1 },
];

function pickRoute() {
  const total = ROUTES.reduce((sum, route) => sum + route.weight, 0);
  let rand = Math.random() * total;
  return ROUTES.find((route) => (rand -= route.weight) <= 0) || ROUTES[0];
}

async function runOne() {
  const route = pickRoute();
  try {
    await axios[route.method](`${BASE}${route.url}`, {});
  } catch (_) {
    // 503 from /error is expected — swallow it so seeding continues.
  }
}

async function seed() {
  console.log(`\nSeeding ${COUNT} requests against ${BASE}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  for (let i = 0; i < COUNT; i += CONCURRENCY) {
    const batch = Math.min(CONCURRENCY, COUNT - i);
    await Promise.all(Array.from({ length: batch }, runOne));
    const done = Math.min(i + CONCURRENCY, COUNT);
    process.stdout.write(`\r  ${done}/${COUNT} requests sent`);
  }

  console.log("\n\nDone. Open the dashboard to see your data.\n");
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
