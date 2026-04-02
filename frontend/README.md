# Greenatomy Frontend

React + Vite dashboard for viewing request telemetry captured by the backend service.

## Folder Layout

```txt
frontend/
  src/
    App.jsx                # sticky navbar + page-level navigation
    components/
      Stats.jsx            # overview KPI + insights
      LogsTable.jsx        # logs explorer table
      ChartsPanel.jsx      # trend/distribution charts
    lib/
      api.js               # API base URL + auth headers
  public/
  index.html
```

## Features (Current)

- Sticky top navbar with page-level sections: `Overview`, `Logs`, `Charts`
- Shareable URLs that preserve the active page, logs filters, sort order, and charts window
- Overview page with KPI cards and insight blocks (error rate, top costly/slow routes, key insights)
- Logs page with inline filter toolbar, date sorting, pagination, status color coding, and slow-request highlighting
- Charts page with multiple chart types via `recharts`:
  - requests over time (line)
  - energy/cost trend (area)
  - status distribution (pie)
  - latency distribution (bar)
- Auth-aware API requests using `VITE_API_TOKEN`
- Loading/error states for all major data surfaces

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

## Shareable Dashboard URLs

The dashboard now syncs key UI state into the browser URL so refresh and copy/paste keep context intact.

Example:

```txt
/?page=logs&method=GET&path=/heavy&range=7d&sort=asc&chartRange=30d
```

Supported query params:

- `page`: `overview`, `logs`, `charts`
- `method`: HTTP method filter for logs
- `path`: request path filter for logs
- `range`: logs time range (`24h`, `7d`, `30d`, `all`, `custom`)
- `from` / `to`: custom datetime values used when `range=custom`
- `sort`: `desc` or `asc`
- `chartRange`: charts window (`24h`, `7d`, `30d`)

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

- No named/saved filter presets across sessions
- Overview cards still use the fixed all-time summary instead of URL-driven filters

## Suggested Next UI Improvements

- Add auto-refresh toggle + polling interval control
- Add drill-down from charts to filtered logs
