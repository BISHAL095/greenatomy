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
      ExternalCostsPanel.jsx # third-party API spend breakdown
    lib/
      api.js               # API base URL, auth/session storage, request headers
  public/
  index.html
```

## Features (Current)

- Sticky left navbar with page-level sections: `Overview`, `Logs`, `Charts`, `Keys`, `Ext. Costs`
- Shareable URLs that preserve the active page, logs filters, sort order, and charts window
- Overview page with KPI cards and insight blocks (error rate, top costly/slow routes, key insights)
- Logs page with inline filter toolbar, date sorting, pagination, status color coding, slow-request highlighting, and resource metric columns
- Charts page with multiple chart types via `recharts`:
  - requests over time (line)
  - energy/cost trend (area)
  - status distribution (pie)
  - latency distribution (bar)
- External costs page with provider/label breakdown, total spend summary, and per-request averages
- Login/register flow using backend-issued bearer tokens
- Session persistence in localStorage for refresh-safe dashboard state
- Project selector, environment selector, and project API key management
- Auth-aware API requests using stored user session tokens
- Stale-request guards so old failed requests do not leave error banners after newer data loads
- Loading/error states for all major data surfaces

## Telemetry Fields Displayed

The Logs page shows the backend-calculated model output and the resource inputs used by the estimator:

- `durationMs`, `cpuUsedMs`
- `memoryDeltaMb`, `ioBytes`, `networkBytes`
- `provider`, `region`
- `energyKwh`, `cost`

External API cost attribution fields (`externalCosts`, `totalExternalCostUsd`) are tracked via
`tracker.trackCost()` in the SDK and visible on the Ext. Costs dashboard page.

## Prerequisites

- Node.js 20+

## Environment Variables

Create `frontend/.env`:

```env
VITE_API_BASE=http://localhost:8000
```

`VITE_API_TOKEN` is no longer used. The dashboard signs in through `/auth/login` and stores the returned user session token in localStorage.

For Vercel, set `VITE_API_BASE` in the Vercel project environment variables and redeploy. The backend must include the Vercel URL in `CORS_ORIGIN`.

If `VITE_API_BASE` points to an `ngrok-free.dev` URL, the frontend automatically sends `ngrok-skip-browser-warning: true`.

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

- `page`: `overview`, `logs`, `charts`, `keys`, `costs`
- `method`: HTTP method filter for logs
- `path`: request path filter for logs
- `range`: logs time range (`24h`, `7d`, `30d`, `all`, `custom`)
- `from` / `to`: custom datetime values used when `range=custom`
- `sort`: `desc` or `asc`
- `environment`: `development`, `staging`, or `production`
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
- Browser localStorage is used for the dashboard session snapshot, so users should log out on shared machines
- External cost breakdown has no date picker of its own — uses the range filter from the logs page

## Suggested Next UI Improvements

- Add auto-refresh toggle + polling interval control
- Add drill-down from charts to filtered logs
- Add sparkline or bar chart to the Ext. Costs page for spend over time
- Add per-request cost detail view showing individual ExternalCost records
