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
- Auth-protected telemetry ingestion APIs
- Dashboard visualization for request logs and route-level analytics
- Aggregated request statistics
- Middleware-based SDK integration
- Demo application for SDK testing
- Backend + frontend test suites

### In Progress / Not Yet Production Ready:
- Full multi-tenant project isolation
- Per-project API key architecture
- Advanced carbon estimation model
- Request cost attribution for external APIs (OpenAI, Anthropic, Stripe, etc.)
- Rate limiting + abuse prevention
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
    PORT=3000
    AUTH_TOKEN=replace-with-strong-token
    NODE_ENV=development

Run:

    npx prisma migrate deploy
    node index.js

## 2. Start Frontend Dashboard

    cd frontend
    npm install

Create `.env` inside `frontend/`:

    VITE_API_BASE=http://localhost:3000
    VITE_API_TOKEN=replace-with-same-backend-auth-token

Run:

    npm run dev

## 3. Integrate Greenatomy SDK Into Your App

Install or link `greenatomy-sdk`, then use middleware:

    const express = require("express");
    const { greenatomyMiddleware } = require("greenatomy-sdk");

    const app = express();

    app.use(
      greenatomyMiddleware({
        baseUrl: "http://localhost:3000",
        apiKey: "your-auth-token"
      })
    );

This enables:
- Automatic route capture
- Latency logging
- Status code tracking
- Telemetry forwarding to Greenatomy backend

# Current API Endpoints

## Public:
- `GET /health`

## Protected:
- `POST /telemetry`
- `GET /logs?limit=10&method=GET&path=/heavy&range=24h`
- `GET /logs/stats?method=GET&path=/heavy&range=24h`

# Auth Model (Current MVP)

Greenatomy currently supports:
- `Authorization: Bearer <token>`
- `x-api-key: <AUTH_TOKEN>`

### Important:
For MVP, SDK `x-api-key` must match backend `AUTH_TOKEN` exactly.

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
- Request validation
- Rate limiting
- Payload sanitization
- Abuse prevention

## Product:
- External API cost tracking
- Carbon scoring engine improvements
- Route optimization recommendations
- OpenTelemetry compatibility

## Engineering:
- CI/CD pipeline
- Lint/test/build gates
- Dockerization
- Production deployment configs
- Logging + tracing

# Deployment Vision

## Recommended Stack:
- Frontend: Vercel
- Backend: Railway / Render / Fly.io
- Database: Neon / Supabase PostgreSQL

## Suggested Domains:
- `app.greenatomy.com` -> Dashboard
- `api.greenatomy.com` -> Backend Collector

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