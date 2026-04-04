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
});
```

The SDK sends the token as a Bearer token in the `Authorization` header.

Current SDK scope:

- `getLogs()`
- `getStats()`

## API

### `getLogs(params?)`

Fetches log entries from `GET /logs`.

```js
const logs = await client.getLogs({
  page: 1,
  limit: 20,
});
```

### `getStats(params?)`

Fetches aggregated log stats from `GET /logs/stats`.

```js
const stats = await client.getStats();
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
- `token` is required.
- The client removes trailing slashes from `baseUrl`.
- The SDK currently supports logs and stats endpoints only.
