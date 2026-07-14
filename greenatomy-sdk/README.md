# Greenatomy SDK

Lightweight Node.js SDK for the Greenatomy logs and stats APIs.

## Install

```bash
npm install greenatomy-sdk
```

For local development from this repository:

```bash
npm install ./greenatomy-sdk
```

If you are working inside the SDK folder directly:

```bash
npm install
```

## Usage

```js
const GreenatomyClient = require("greenatomy-sdk");

const client = new GreenatomyClient({
  baseUrl: "https://api.your-greenatomy-host.com",
  apiKey: "ga_live_your_project_key",
  timeout: 8000,
});
```

Use the backend URL for your own deployment.

You can authenticate with either:

- apiKey (`x-api-key`): Recommended for project-specific telemetry ingestion from production/staging/development apps
- token (`Authorization: Bearer <token>`): Recommended for authenticated dashboard, user, and analytics reads

You can also override the default request timeout of `5000` ms with `timeout`.

Current SDK scope:

- `getLogs()`
- `createLog()`
- `getStats()`
- `getSummary()`
- `healthCheck()`
- `greenatomyMiddleware()`
- `CostTracker` / `res.locals.greenatomy.trackCost()` for per-request external API cost annotations

## API

### `getLogs(params?)`

Fetches log entries from `GET /logs`.

```js
const logs = await client.getLogs({
  page: 1,
  limit: 20,
});
```

### `createLog(payload)`

Creates a telemetry log via `POST /logs`.

```js
const createdLog = await client.createLog({
  method: "GET",
  path: "/api/users",
  statusCode: 200,
  durationMs: 142,
  cpuUsedMs: 38.5,
  memoryDeltaMb: 4.2,
  ioBytes: 0,
  networkBytes: 8192,
  provider: "aws",
  region: "ap-south-1",
});
```

Common payload fields:

- `method` (required)
- `path` (required)
- `statusCode` (optional)
- `durationMs` (required)
- `cpuUsedMs` (optional, defaults to `0`)
- `memoryDeltaMb` (optional, defaults to `0`)
- `ioBytes` (optional, defaults to `0`)
- `networkBytes` (optional, defaults to `0`)
- `provider` (optional, used for the energy model PUE factor)
- `region` (optional, used for the model tariff factor)
- `externalCosts` (optional, collected by middleware when route handlers call `trackCost`; the backend persists these costs to `ExternalCost` records)
- `totalExternalCostUsd` (optional, sum of `externalCosts`)
- `createdAt` (optional)

`energyKwh`, `cost`, and `cpuUtil` are calculated by the backend collector and returned in the stored log.

### `greenatomyMiddleware(options)`

Express-style middleware for automatic inbound request telemetry.

```js
const express = require("express");
const GreenatomyClient = require("greenatomy-sdk");
const { greenatomyMiddleware } = GreenatomyClient;

const app = express();

app.use(
  greenatomyMiddleware({
    baseUrl: "https://api.your-greenatomy-host.com",
    apiKey: "ga_live_project_environment_key",
    environment: "production",
    provider: "aws",
    region: "ap-south-1",
  })
);
```

By default the middleware:

- tracks every inbound request except `OPTIONS`
- measures wall-clock request duration
- sends `method`, `path`, `statusCode`, `durationMs`, and `createdAt`
- sends best-effort `cpuUsedMs`, `memoryDeltaMb`, `ioBytes`, and `networkBytes`
- never blocks the user request if telemetry submission fails
- associates logs with the issuing project API key
- tags logs by environment (`development`, `staging`, `production`)
- exposes `res.locals.greenatomy.trackCost(...)` so route handlers can annotate external API spend on the current request

Optional middleware options:

- `shouldTrack(req, res)` to selectively skip requests
- `onError(error, req, res)` to observe telemetry transport failures
- `timeout` to override the default request timeout
- `provider` and `region` to tune backend energy estimates
- `environment` to separate development, staging, and production traffic

`cpuUsedMs`, `memoryDeltaMb`, and `networkBytes` are measured best-effort from Node.js process/socket APIs. `ioBytes` defaults to `0` unless an application sends a measured value manually via `createLog()`.

### External API Cost Annotations

Inside an Express route, call `res.locals.greenatomy.trackCost(...)` after an external API call:

```js
app.post("/chat", async (req, res) => {
  const started = Date.now();
  const response = await callProvider();

  res.locals.greenatomy?.trackCost({
    provider: "openai",
    model: "gpt-4o-mini",
    operation: "chat.completions",
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
    costUsd: 0.0012,
    latencyMs: Date.now() - started,
    label: "support-chat",
  });

  res.json(response);
});
```

The middleware attaches accumulated records to the telemetry payload as `externalCosts` and `totalExternalCostUsd`. The backend persists these records and exposes the `/logs/external-breakdown` query endpoint.

### `getStats(params?)`

Fetches aggregated log stats from `GET /logs/stats`.

```js
const stats = await client.getStats();
```

### `getSummary(params?)`

Fetches a lightweight deployment-ready overview from `GET /logs/summary`.

```js
const summary = await client.getSummary({ range: "24h" });
```

### `getExternalBreakdown(params?)`

Fetches external API cost breakdowns from `GET /logs/external-breakdown`.

```js
const breakdown = await client.getExternalBreakdown({
  groupBy: "provider",
  range: "7d",
});
```

This endpoint is implemented in the backend and available for use.

## Error Handling

The SDK throws `GreenatomySdkError` for HTTP, timeout, and network failures.

```js
const GreenatomyClient = require("greenatomy-sdk");
const { GreenatomySdkError } = GreenatomyClient;

try {
  const logs = await client.getLogs();
  console.log(logs);
} catch (error) {
  if (error instanceof GreenatomySdkError) {
    console.error(error.message);
    console.error(error.statusCode);
    console.error(error.code);
  } else {
    throw error;
  }
}
```

Possible `error.code` values:

- `UNAUTHORIZED`
- `RATE_LIMITED`
- `HTTP_ERROR`
- `TIMEOUT`
- `NETWORK_ERROR`

## Notes

- `baseUrl` is required.
- Either `token` or `apiKey` is required.
- API keys are project-scoped and generated from the dashboard.
- Raw API keys are shown only once during creation.
- Separate API keys can be used per environment for safer production isolation.
- `timeout` is optional and defaults to `5000` ms.
- The client removes trailing slashes from `baseUrl`.
- The SDK currently supports logs, telemetry creation, stats, and summary endpoints.
- The SDK now also includes Express-style middleware for inbound request tracking.
- `token` is ideal for authenticated dashboard/user access.
- `apiKey` is ideal for project-level telemetry ingestion.
- The static backend `AUTH_TOKEN` should not be used in browser clients.
- External API cost annotations are best-effort and never block the host app request.

## Recommended Onboarding

1. Register in the hosted dashboard.
2. Create a project.
3. Generate an API key for that project.
4. Save the raw API key when it is shown. It is only displayed once.
5. Configure the SDK with that API key and your hosted `baseUrl`.
