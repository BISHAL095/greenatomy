# Greenatomy Demo

Small Express app that uses the current `greenatomy-sdk` middleware.

## What It Shows

- SDK configured with `apiKey` or `token`
- automatic inbound telemetry via `greenatomyMiddleware(...)`
- provider/region-aware energy model metadata
- a few sample routes you can hit to create logs

## Install

From the repo root:

```bash
npm --prefix demo install
```

## Run

Set your collector URL and project API key first:

```bash
export GREENATOMY_BASE_URL="http://localhost:5000"
export GREENATOMY_API_KEY="ga_live_your_project_key"
export GREENATOMY_PROVIDER="aws"
export GREENATOMY_REGION="ap-south-1"
npm --prefix demo start
```

If you want bearer auth instead:

```bash
export GREENATOMY_BASE_URL="http://localhost:5000"
export GREENATOMY_TOKEN="your-user-token"
npm --prefix demo start
```

Optional environment variables:

- `DEMO_PORT` default: `4100`
- `GREENATOMY_PROVIDER` default: `generic`
- `GREENATOMY_REGION` default: `global`

## Demo Routes

After the app starts, hit a few routes:

```bash
curl http://localhost:4100/
curl http://localhost:4100/users
curl http://localhost:4100/heavy
curl http://localhost:4100/error
```

These routes are tracked automatically by the SDK middleware and sent to your hosted collector.

`GET /health` exists but is intentionally not tracked in the demo middleware config.

## Where To Check Results

1. Open the Greenatomy dashboard
2. Select the same project that owns the API key
3. Check:
   - `Overview`
   - `Logs`
   - `Charts`

## Minimal Integration Pattern

```js
const express = require("express");
const GreenatomyClient = require("greenatomy-sdk");

const { greenatomyMiddleware } = GreenatomyClient;
const app = express();

app.use(
  greenatomyMiddleware({
    baseUrl: process.env.GREENATOMY_BASE_URL,
    apiKey: process.env.GREENATOMY_API_KEY,
    provider: process.env.GREENATOMY_PROVIDER,
    region: process.env.GREENATOMY_REGION,
  })
);
```

The SDK sends best-effort `cpuUsedMs`, `memoryDeltaMb`, `networkBytes`, and `ioBytes` alongside route metadata. The backend uses those fields with provider PUE and regional tariff factors to calculate `energyKwh`, `cost`, and `cpuUtil`.
