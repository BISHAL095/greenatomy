# Greenatomy

Greenatomy is a carbon-aware API telemetry and cost intelligence platform designed to help developers track per-request operational cost, latency, and estimated carbon footprint across their applications.

It currently consists of:
- `backend`: Express + Prisma ingestion and analytics API for telemetry capture, auth, aggregation, and PostgreSQL persistence
- `frontend`: React + Vite dashboard for request logs, route-level insights, cost trends, and carbon analytics
- `greenatomy-sdk`: Middleware-based SDK for automatic route telemetry capture in external applications

## Monorepo Structure

    greenatomy/
      backend/         # Express API, auth middleware, telemetry ingestion, Prisma schema/migrations
      frontend/        # React + Vite analytics dashboard
      greenatomy-sdk/  # SDK middleware for request interception + telemetry forwarding

## Current Project State (MVP Beta)

Greenatomy is currently in functional MVP/Beta stage.

### Working:
- End-to-end telemetry pipeline:  
  SDK/App Request -> Middleware Capture -> Backend Collector -> PostgreSQL -> Dashboard
- Route-level request logging
- Latency tracking
- Status code capture
- Resource-aware energy model using CPU time, memory delta, network bytes, IO bytes, provider PUE, and regional tariff inputs
- Auth-protected telemetry ingestion APIs
- User registration/login with signed dashboard sessions
- Project creation and project-scoped API key management
- Dashboard visualization for request logs and route-level analytics
- Aggregated request statistics
- Environment-aware filtering for development, staging, and production traffic
- Middleware-based SDK integration
- Demo application for SDK testing
- Backend + frontend test suites

### In Progress / Not Yet Production Ready:
- Full enterprise-grade multi-tenant project isolation
- Request cost attribution for external APIs (OpenAI, Anthropic, Stripe, etc.)
- Advanced abuse prevention
- CI/CD automation
- Observability stack (logging, tracing, alerting)

## Core Product Goal

Greenatomy helps developers answer:
- Which endpoints cost the most money?
- Which routes consume the most compute?
- Which requests generate the highest estimated carbon footprint?
- Where can performance and environmental efficiency be improved?

# Quick Start

## 1. Start Backend

    cd backend
    npm install

Create `.env` inside `backend/`:

    DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
    PORT=8000
    CORS_ORIGIN=http://localhost:5173
    AUTH_TOKEN=replace-with-strong-token
    AUTH_TOKEN_SECRET=replace-with-strong-token
    NODE_ENV=development

Run:

    npx prisma migrate deploy
    node index.js

## 2. Start Frontend Dashboard

    cd frontend
    npm install

Create `.env` inside `frontend/`:

    VITE_API_BASE=http://localhost:8000

Run:

    npm run dev

> For production, deploy the backend first and set `VITE_API_BASE` in Vercel to the backend HTTPS URL. If the backend is behind ngrok, the frontend automatically sends the `ngrok-skip-browser-warning` header for `ngrok-free.dev` API bases.

## 3. Integrate Greenatomy SDK Into Your App

Install or link `greenatomy-sdk`, then use middleware:

    const express = require("express");
    const { greenatomyMiddleware } = require("greenatomy-sdk");

    const app = express();

    app.use(
      greenatomyMiddleware({
        baseUrl: "http://localhost:8000",
        apiKey: "your-project-api-key",
        provider: "aws",
        region: "ap-south-1"
      })
    );

This enables:
- Automatic route capture
- Latency logging
- Status code tracking
- Best-effort CPU, memory, network, and IO resource telemetry
- Provider/region-aware energy and cost estimation
- Telemetry forwarding to Greenatomy backend

# Current API Endpoints

## Public:
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

## Protected:
- `GET /auth/me`
- `POST /auth/projects`
- `GET /auth/projects/:projectId/keys`
- `POST /auth/projects/:projectId/keys`
- `POST /auth/projects/:projectId/keys/:keyId/revoke`
- `POST /logs`
- `GET /logs?limit=10&method=GET&path=/heavy&range=24h`
- `GET /logs/stats?method=GET&path=/heavy&range=24h`
- `GET /logs/summary?range=24h`

# Auth Model (Current MVP)

Greenatomy currently supports:
- `Authorization: Bearer <user-session-token>` for dashboard and authenticated analytics reads
- `x-api-key: <project-api-key>` for SDK telemetry ingestion
- Optional static `AUTH_TOKEN` for system/admin-style access to telemetry routes

### Important:
For project telemetry ingestion, use `x-api-key` with a generated project API key. Bearer tokens are intended for authenticated dashboard/user access. The static `AUTH_TOKEN` is not a frontend session token and should not be exposed in browser builds.

# Run Tests

## Backend:

    cd backend
    npm test

## Frontend:

    cd frontend
    npm test

# Suggested Next Improvements

## Platform:
- Per-project API keys
- Multi-tenant project isolation
- Role-based authorization
- Team dashboards

## Security:
- Broader request validation and payload sanitization
- Stronger abuse prevention
- Secret management hardening

## Product:
- External API cost tracking
- Carbon scoring engine improvements
- Route optimization recommendations
- OpenTelemetry compatibility

## Engineering:
- CI/CD pipeline
- Lint/test/build gates
- Production Docker/ECS workflow hardening
- Logging + tracing

# Deployment Vision

## Recommended Stack:
- Frontend: Vercel
- Backend: AWS ECS/Fargate, EC2, Render, or another Node-compatible host
- Database: Neon / Supabase / AWS RDS PostgreSQL

## Suggested Domains:
- `app.greenatomy.com` -> Dashboard
- `api.greenatomy.com` -> Backend Collector

> Deploy the backend first, configure `CORS_ORIGIN` with the frontend URL, then deploy the frontend with `VITE_API_BASE` pointing to the backend URL.

# MVP Positioning

Greenatomy is currently best suited for:
- Internal testing
- Developer beta users
- Build-in-public feedback
- SDK validation

## Not yet optimized for:
- Large-scale SaaS deployment
- Enterprise tenant isolation
- Public SDK distribution at scale

# Mission

Greenatomy aims to make software infrastructure more operationally efficient, financially transparent, and environmentally responsible by turning every API request into actionable intelligence.
