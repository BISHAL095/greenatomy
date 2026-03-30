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
- View aggregated stats (requests, latency, energy, cost)
- View latest request telemetry logs
- Basic loading/error states

## Prerequisites

- Node.js 20+

## Environment Variables

Create `frontend/.env`:

```env
VITE_API_BASE=http://localhost:3000
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

## Current Limitations

- No auth-aware UI yet
- No pagination controls in table
- No saved filters/dashboard presets

## Suggested Next UI Improvements

- Add date/time range filters
- Add auto-refresh toggle + polling interval control
- Add pagination and sorting
- Add empty/error recovery actions
