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
- Auth-protected telemetry APIs and test suites are in place
- Not yet fully production ready (multi-tenant isolation, stronger validation, rate limiting, CI/CD)

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
AUTH_TOKEN=replace-with-strong-token
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
VITE_API_TOKEN=replace-with-same-backend-auth-token
```

Run dev server:

```bash
npm run dev
```

## Run Tests

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
```

## API Endpoints (Current)

- `GET /health`
- `GET /logs?limit=10&method=GET&path=/heavy&range=24h`
- `GET /logs/stats?method=GET&path=/heavy&range=24h`

## Suggested Next Improvements

- Add tenant isolation and role-based authorization
- Add request validation + sane query limits
- Move frontend pagination/sorting fully server-side for large datasets
- Add CI pipeline for lint/test/build gates
- Add logging/metrics/tracing for operational visibility
