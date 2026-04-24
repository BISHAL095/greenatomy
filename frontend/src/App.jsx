import { Suspense, lazy, useDeferredValue, useEffect, useState } from "react";
import Stats from "./components/Stats";
import LogsTable from "./components/LogsTable";
import "./App.css";

// Defer the chart bundle until the charts view is actually opened.
const ChartsPanel = lazy(() => import("./components/ChartsPanel"));

const VALID_PAGES = new Set(["overview", "logs", "charts"]);
const VALID_RANGES = new Set(["24h", "7d", "30d", "all", "custom"]);
const VALID_SORTS = new Set(["asc", "desc"]);
const VALID_CHART_RANGES = new Set(["24h", "7d", "30d"]);

function readDashboardState() {
  // Treat the URL as the persisted dashboard state so refresh/share works without extra storage.
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  const range = params.get("range");
  const sort = params.get("sort");
  const chartRange = params.get("chartRange");

  return {
    currentPage: VALID_PAGES.has(page) ? page : "overview",
    filters: {
      method: (params.get("method") ?? "").toUpperCase(),
      path: params.get("path") ?? "",
      range: VALID_RANGES.has(range) ? range : "24h",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      sort: VALID_SORTS.has(sort) ? sort : "desc",
    },
    chartRange: VALID_CHART_RANGES.has(chartRange) ? chartRange : "7d",
  };
}

function buildDashboardSearch({ currentPage, filters, chartRange }) {
  // Only serialize filters that are currently meaningful to keep URLs compact.
  const params = new URLSearchParams();

  params.set("page", currentPage);
  params.set("range", filters.range);
  params.set("sort", filters.sort);
  params.set("chartRange", chartRange);

  if (filters.method) {
    params.set("method", filters.method);
  }

  if (filters.path) {
    params.set("path", filters.path);
  }

  if (filters.range === "custom") {
    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }
  }

  return params.toString();
}

function App() {
  const [dashboardState, setDashboardState] = useState(readDashboardState);
  const { currentPage, filters, chartRange } = dashboardState;
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    // Mirror browser back/forward navigation into component state.
    const syncFromUrl = () => {
      setDashboardState(readDashboardState());
    };

    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  useEffect(() => {
    // Replace the current history entry so transient dashboard changes do not spam back-stack history.
    const search = buildDashboardSearch(dashboardState);
    const nextUrl = `${window.location.pathname}?${search}${window.location.hash}`;

    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [dashboardState]);

  function setCurrentPage(page) {
    setDashboardState((current) => ({
      ...current,
      currentPage: page,
    }));
  }

  function updateFilter(key, value) {
    setDashboardState((current) => ({
      ...current,
      filters: {
        ...current.filters,
        [key]: value,
      },
    }));
  }

  function handleRangeChange(value) {
    // Clear stale custom boundaries when switching back to a preset range.
    setDashboardState((current) => ({
      ...current,
      filters: {
        ...current.filters,
        range: value,
        ...(value === "custom" ? {} : { from: "", to: "" }),
      },
    }));
  }

  function handleChartRangeChange(value) {
    setDashboardState((current) => ({
      ...current,
      chartRange: value,
    }));
  }

  const overviewFilters = {
    // The overview is intentionally pinned to all-time aggregates.
    method: "",
    path: "",
    range: "all",
    from: "",
    to: "",
    sort: "desc",
  };

  return (
    <div className="app-shell">
      <header className="site-navbar">
        <div className="site-brand">
          <p className="eyebrow">Green-Ops Monitor</p>
          <p className="brand-title">Carbon-aware backend telemetry</p>
        </div>
        <nav className="page-nav" aria-label="Dashboard pages">
          <button
            type="button"
            className={`page-link ${currentPage === "overview" ? "active" : ""}`}
            onClick={() => setCurrentPage("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`page-link ${currentPage === "logs" ? "active" : ""}`}
            onClick={() => setCurrentPage("logs")}
          >
            Logs
          </button>
          <button
            type="button"
            className={`page-link ${currentPage === "charts" ? "active" : ""}`}
            onClick={() => setCurrentPage("charts")}
          >
            Charts
          </button>
        </nav>
      </header>

      <main className="dashboard">
        {currentPage === "overview" ? (
          <>
            <section className="hero-panel">
              <div className="hero-copy">
                <p className="eyebrow">Landing</p>
                <h2>Operational snapshot</h2>
                <p className="hero-text">
                  All-time platform metrics and key operational insights.
                  Navigate to Logs for route-level investigation and filtering.
                </p>
              </div>
            </section>
            <Stats filters={overviewFilters} />
          </>
        ) : null}

      {currentPage === "logs" ? (
          <section className="logs-toolbar-panel">
            <div className="logs-toolbar-head">
              <p className="eyebrow">Logs explorer</p>
              <h2>Investigate request-level telemetry</h2>
              <p className="hero-text">
                Use filters, sorting, and pagination to inspect hotspots and
                trends in backend requests.
              </p>
            </div>

            <div className="inline-filters">
                <label className="inline-field">
                  <span>HTTP method</span>
                  <input
                    value={filters.method}
                    placeholder="GET"
                    onChange={(e) => updateFilter("method", e.target.value.toUpperCase())}
                  />
                </label>

                <label className="inline-field">
                  <span>Request path</span>
                  <input
                    value={filters.path}
                    placeholder="/heavy"
                    onChange={(e) => updateFilter("path", e.target.value)}
                  />
                </label>

                <label className="inline-field">
                  <span>Time range</span>
                  <select value={filters.range} onChange={(e) => handleRangeChange(e.target.value)}>
                    <option value="24h">Last 24h</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                {filters.range === "custom" ? (
                  <>
                    <label className="inline-field">
                      <span>From</span>
                      <input
                        type="datetime-local"
                        value={filters.from}
                        onChange={(e) => updateFilter("from", e.target.value)}
                      />
                    </label>
                    <label className="inline-field">
                      <span>To</span>
                      <input
                        type="datetime-local"
                        value={filters.to}
                        onChange={(e) => updateFilter("to", e.target.value)}
                      />
                    </label>
                  </>
                ) : null}

                <label className="inline-field">
                  <span>Date sort</span>
                  <select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </label>
              </div>
            <p className="hero-card-caption">
              Filter the feed to inspect hotspots, heavy routes, or a single API
              pattern.
            </p>
          </section>
        ) : null}

        {currentPage === "logs" ? <LogsTable filters={deferredFilters} /> : null}
        {currentPage === "charts" ? (
          <Suspense fallback={<section className="stats-panel"><p className="empty-state">Loading charts...</p></section>}>
            <ChartsPanel range={chartRange} onRangeChange={handleChartRangeChange} />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
}

export default App;
