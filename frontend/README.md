# Greenatomy Frontend

React + Vite dashboard for viewing request telemetry captured by the backend service.

## Folder Layout

```txt
frontend/
  src/
    App.jsx                # page composition and filters state
    components/
      Stats.jsx            # aggregated metrics cards
      LogsTable.jsx        # recent request log table
    lib/
      api.js               # API base URL helper
  public/
  index.html
```

## Features (Current)

- Filter by HTTP method and request path
- Filter by time window (`24h`, `7d`, `30d`, `all`, custom)
- Sort logs by date (newest/oldest)
- Paginate logs table with page-size control
- View aggregated stats (requests, latency, energy, cost)
- View latest request telemetry logs
- Basic loading/error states
- Sends auth token in API requests when `VITE_API_TOKEN` is configured

## Prerequisites

- Node.js 20+

## Environment Variables

Create `frontend/.env`:

```env
VITE_API_BASE=http://localhost:3000
VITE_API_TOKEN=replace-with-same-backend-auth-token
```

## Install

```bash
npm install
```

## Run in Dev

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Test

```bash
npm test
```

## Current Limitations

- No saved filters/dashboard presets

## Suggested Next UI Improvements

- Add date/time range filters
- Add auto-refresh toggle + polling interval control
- Add pagination and sorting
- Add empty/error recovery actions
