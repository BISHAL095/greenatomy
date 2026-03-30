# Greenatomy

Greenatomy is a carbon-aware request telemetry dashboard.
It has two apps:
- `backend`: Express + Prisma API that captures per-request metrics and stores them in PostgreSQL
- `frontend`: React + Vite dashboard that visualizes request logs and aggregated stats

## Monorepo Structure

```txt
greenatomy/
  backend/      # API, telemetry middleware, Prisma schema/migrations
  frontend/     # dashboard UI
  dashboard/    # currently unused placeholder directory
```

## Current Project State

This repository is in MVP stage:
- End-to-end flow works (request -> telemetry capture -> DB -> dashboard)
- Good baseline separation for current scope
- Not yet production ready (auth, tenant isolation, validation, rate limit, tests, CI)

## Quick Start

### 1. Start backend

```bash
cd backend
npm install
```

Create `.env` in `backend/` with at least:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
PORT=3000
```

Run migrations and start server:

```bash
npx prisma migrate deploy
node index.js
```

### 2. Start frontend

```bash
cd frontend
npm install
```

Create `.env` in `frontend/`:

```env
VITE_API_BASE=http://localhost:3000
```

Run dev server:

```bash
npm run dev
```

## API Endpoints (Current)

- `GET /health`
- `GET /logs?limit=10&method=GET&path=/heavy`
- `GET /logs/stats?method=GET&path=/heavy`

## Suggested Next Improvements

- Add authentication and tenant isolation
- Add request validation + sane query limits
- Add pagination and time-range filters
- Add tests and CI pipeline
- Add logging/metrics/tracing for operational visibility
