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
  lib/
    prisma.js              # Prisma client initialization
  middlewares/
    estimator.js           # request telemetry capture middleware
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
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

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

## API

- `GET /health` -> health probe
- `GET /logs` -> latest request logs (supports time windows)
- `GET /logs/stats` -> aggregated telemetry (supports time windows)

### Example

```bash
curl "http://localhost:3000/logs?limit=10&method=GET&path=/heavy&range=24h"
```

### Time Window Query Params

- `range`: `24h` (default), `7d`, `30d`, `all`
- `from`: custom start datetime (ISO string)
- `to`: custom end datetime (ISO string)

`from`/`to` take precedence over `range`.

## Notes

- Middleware skips `/logs`, `/health`, and `OPTIONS` requests
- Energy and cost are heuristic estimates intended for trend analysis
