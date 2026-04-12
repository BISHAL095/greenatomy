# Greenatomy Demo

Small runnable example for `greenatomy-sdk`.

## Run

From the repo root:

```bash
export GREENATOMY_BASE_URL="http://localhost:5000"
export GREENATOMY_TOKEN="your-auth-token"
npm --prefix demo start
```

If you prefer API key auth:

```bash
export GREENATOMY_BASE_URL="http://localhost:5000"
export GREENATOMY_API_KEY="your-auth-token"
npm --prefix demo start
```

Optional environment variables:

- `GREENATOMY_RANGE` default: `24h`
- `GREENATOMY_TIMEOUT` default: `5000`

The demo prints:

- `getSummary()`
- `getStats()`
