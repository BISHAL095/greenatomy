# Greenatomy Backend

Express API that captures telemetry for each request and stores it in PostgreSQL via Prisma.

## Folder Layout

```txt
backend/
  index.js                 # app bootstrap and routes
  config/
    env.js                 # centralized env parsing/config values
  controllers/
    logsController.js      # HTTP handlers
    authController.js      # registration/login/project/key handlers
  lib/
    prisma.js              # Prisma client initialization
  middlewares/
    auth.js                # telemetry route auth for user tokens/static token
    apiKeyAuth.js          # project API key auth for log ingestion
    userAuth.js            # dashboard/user auth middleware
    rateLimit.js           # simple fixed-window limiter
  routes/
    logs.js                # route definitions
  services/
    logsService.js         # DB-facing business logic
  utils/
    energyCalculator.js    # energy/cost estimation logic
  validators/
    logsValidator.js       # query validation/normalization
  prisma/
    schema.prisma
    migrations/
      20260603114443_external_api_costs_addition/
```

## Why this structure is good for current scope

- Responsibilities are separated by concern (routing, middleware, persistence, utility logic)
- Easy to read for a small team and fast to iterate
- Prisma schema and migrations are isolated correctly under `prisma/`

## Where to improve for scalability

- Add `controllers/` and `services/` when route logic grows
- Add `validators/` for query/body validation
- Add `config/` for typed environment handling
- Add `tests/` (unit + integration)

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
PORT=8000
CORS_ORIGIN=http://localhost:5173
AUTH_TOKEN=replace-with-strong-token
AUTH_TOKEN_SECRET=replace-with-strong-token
AUTH_TOKEN_TTL_SECONDS=604800
LOGS_RATE_LIMIT_WINDOW_MS=60000
LOGS_RATE_LIMIT_MAX_REQUESTS=60
GREENATOMY_PROVIDER=aws
GREENATOMY_REGION=ap-south-1
```

`CORS_ORIGIN` can be a comma-separated list for multiple frontend origins:

```env
CORS_ORIGIN=http://localhost:5173,https://your-app.vercel.app
```

`AUTH_TOKEN_SECRET` signs dashboard session tokens. If omitted, the backend falls back to `AUTH_TOKEN`.

## Install

```bash
npm install
```

## Database Setup

Create and apply migrations:

```bash
npx prisma migrate dev
```

For production deploys:

```bash
npx prisma migrate deploy
```

## Run

```bash
node index.js
```

## Test

```bash
npm test
```

## API

- `GET /health` -> health probe
- `POST /auth/register` -> create user and default project
- `POST /auth/login` -> create signed dashboard session
- `GET /auth/me` -> current user and projects
- `POST /auth/projects` -> create project
- `GET /auth/projects/:projectId/keys` -> list project API keys
- `POST /auth/projects/:projectId/keys` -> create project API key
- `POST /auth/projects/:projectId/keys/:keyId/revoke` -> revoke project API key
- `POST /logs` -> create a request telemetry log (protected)
- `GET /logs` -> latest request logs (protected, supports time windows)
- `GET /logs/stats` -> aggregated telemetry (protected, supports time windows)
- `GET /logs/summary` -> deployment overview and route recommendations (protected)
- `GET /logs/external-breakdown` -> external API spend grouped by provider or label (protected)

### Auth Model

- Dashboard routes use `Authorization: Bearer <user-session-token>`.
- SDK ingestion uses `x-api-key: <project-api-key>`.
- Telemetry read routes accept signed user tokens; they can also accept the optional static `AUTH_TOKEN` when configured.
- `POST /logs` additionally validates the project API key and stores the owning `projectId`/`apiKeyId`.

### Create Log Payload

```json
{
  "method": "GET",
  "path": "/api/users",
  "statusCode": 200,
  "durationMs": 142,
  "cpuUsedMs": 38.5,
  "memoryDeltaMb": 4.2,
  "ioBytes": 0,
  "networkBytes": 8192,
  "provider": "aws",
  "region": "ap-south-1",
  "environment": "production"
}
```

The backend calculates `energyKwh`, `cost`, and `cpuUtil`. Missing resource metrics default to `0`; missing provider/region falls back to the generic/global model.

### Energy Model Notes

- CPU and memory energy are estimated from request duration, CPU time, memory delta, and a simple per-core power envelope.
- IO energy is multiplied by provider PUE because it is treated as datacenter-side work.
- Network transfer energy is not multiplied by provider PUE because it is treated separately from datacenter overhead.
- `cpuUtil` remains a request-local single-core ratio (`cpuUsedMs / durationMs`) for backward compatibility.
- Very small energy values can round to `0.00000000`; this is expected for negligible requests.
- Supported regional tariff keys include `ap-south-1`, `ap-south-2`, `asia-south1`, `asia-south2`, `central-india`, `south-india`, `india`, and `global`.

### External API Costs

The `ExternalCost` table and `RequestLog.totalExternalCostUsd` column were added via migration:

```txt
prisma/migrations/20260603114443_external_api_costs_addition/
```

SDK middleware attaches a `CostTracker` to `res.locals.greenatomy` per request. Route handlers call `tracker.trackCost({ provider, operation, costUsd, ... })` for each external API call. On response finish, costs are drained and sent as `externalCosts[]` in the `POST /logs` payload alongside `totalExternalCostUsd`.

The backend persists external costs as nested `ExternalCost` children of `RequestLog` in a single atomic Prisma transaction.

#### External Breakdown Endpoint

```txt
GET /logs/external-breakdown?groupBy=provider&range=24h&environment=production
```

Query params:
- `groupBy`: `provider` (default) or `label`
- `range`, `from`, `to`, `environment`, `projectId`: same semantics as `/logs/stats`

Response:
```json
[
  {
    "provider": "openai",
    "totalCostUsd": 4.203819,
    "requestCount": 312,
    "avgCostPerRequest": 0.013474
  }
]
```

Results are sorted by `totalCostUsd` descending. Empty array when no external costs exist in the window.

#### Create Log Payload with External Costs

```json
{
  "method": "POST",
  "path": "/api/chat",
  "statusCode": 200,
  "durationMs": 1820,
  "cpuUsedMs": 42.1,
  "totalExternalCostUsd": 0.004312,
  "externalCosts": [
    {
      "provider": "openai",
      "model": "gpt-4o",
      "operation": "chat.completions",
      "inputTokens": 512,
      "outputTokens": 148,
      "totalTokens": 660,
      "costUsd": 0.004312,
      "latencyMs": 1640,
      "label": "generate-answer"
    }
  ]
}
```

`externalCosts` is optional. When absent or empty, the fields are omitted and the log is created as before with no child records.

## Automated Test Coverage

- Auth middleware behavior (`401`/authorized flows)
- Logs controller behavior (validator/service integration with mocks)
- Logs route wiring
- Query validator edge cases (range/method/date validation)
- Energy calculator edge cases including legacy signature compatibility, provider/region fallback, negative memory deltas, and network energy handling

### Example

```bash
curl -H "Authorization: Bearer $USER_SESSION_TOKEN" \
  "http://localhost:8000/logs?limit=10&method=GET&path=/heavy&range=24h"
```

Create a telemetry log with a project API key:

```bash
curl -X POST "http://localhost:8000/logs" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $PROJECT_API_KEY" \
  -d '{"method":"GET","path":"/api/users","statusCode":200,"durationMs":142}'
```

### Time Window Query Params

- `range`: `24h` (default), `7d`, `30d`, `all`
- `from`: custom start datetime (ISO string)
- `to`: custom end datetime (ISO string)
- `environment`: `development`, `staging`, or `production`

`from`/`to` take precedence over `range`.

### Rate Limiting

`/logs` and `/logs/stats` are protected by a simple per-IP fixed-window limiter.

- Default window: `60000` ms
- Default max requests per window: `60`
- Configure with `LOGS_RATE_LIMIT_WINDOW_MS` and `LOGS_RATE_LIMIT_MAX_REQUESTS`
- Exceeded requests return `429 Too Many Requests` with a `Retry-After` header

## Notes

- Energy and cost are heuristic estimates intended for trend analysis
- The energy model combines CPU, memory, IO, network transfer, provider PUE, and regional tariff factors; network energy is intentionally not PUE-multiplied
- `/logs` read routes require either `Authorization: Bearer <user-session-token>` or the optional static `AUTH_TOKEN`
- `POST /logs` requires `x-api-key: <project-api-key>` for project-scoped ingestion
- In production, make sure the frontend origin is included in `CORS_ORIGIN`

## Where to improve for scalability

- Add integration tests that run against a real Postgres instance in CI
- Add OpenTelemetry tracing for distributed request visibility
- Move to a service-per-domain structure (auth service, telemetry service) as the API grows
- Add a job queue for async telemetry processing under high ingestion load
