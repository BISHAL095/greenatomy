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
  token: "your-auth-token",
  timeout: 8000,
});
```

You can authenticate with either:

- `token`, sent as `Authorization: Bearer <token>`
- `apiKey`, sent as `x-api-key`

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
  cpuUtil: 24.2,
  energyKwh: 0.000214,
  cost: 0.001245,
});
```

Common payload fields:

- `method` (required)
- `path` (required)
- `statusCode` (optional)
- `durationMs` (required)
- `cpuUsedMs` (required)
- `cpuUtil` (required)
- `energyKwh` (required)
- `cost` (required)
- `projectId` (optional, depending on auth scope)

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