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

## Automated Test Coverage

- Auth middleware behavior (`401`/authorized flows)
- Logs controller behavior (validator/service integration with mocks)
- Logs route wiring
- Query validator edge cases (range/method/date validation)

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
- The energy model combines CPU, memory, IO, network transfer, provider PUE, and regional tariff factors
- `/logs` read routes require either `Authorization: Bearer <user-session-token>` or the optional static `AUTH_TOKEN`
- `POST /logs` requires `x-api-key: <project-api-key>` for project-scoped ingestion
- In production, make sure the frontend origin is included in `CORS_ORIGIN`
