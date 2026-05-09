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
  baseUrl: "http://localhost:5000",
  apiKey: "ga_live_your_project_key",
  timeout: 8000,
});
```

You can authenticate with either:

- `apiKey`, sent as `x-api-key`, recommended for project telemetry ingestion
- `token`, sent as `Authorization: Bearer <token>`, useful for dashboard or user-session reads

You can also override the default request timeout of `5000` ms with `timeout`.

Current SDK scope:

- `getLogs()`
- `createLog()`
- `getStats()`
- `getSummary()`

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
});
```

Common payload fields:

- `method` (required)
- `path` (required)
- `statusCode` (optional)
- `durationMs` (required)
- `cpuUsedMs` (optional, defaults to `0`)
- `createdAt` (optional)

`energyKwh`, `cost`, and `cpuUtil` are calculated by the backend collector and returned in the stored log.

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
- `timeout` is optional and defaults to `5000` ms.
- The client removes trailing slashes from `baseUrl`.
- The SDK currently supports logs, telemetry creation, stats, and summary endpoints.
- `token` is ideal for authenticated dashboard/user access.
- `apiKey` is ideal for project-level telemetry ingestion.

## Recommended Onboarding

1. Register in the hosted dashboard.
2. Create a project.
3. Generate an API key for that project.
4. Save the raw API key when it is shown. It is only displayed once.
5. Configure the SDK with that API key and your hosted `baseUrl`.
