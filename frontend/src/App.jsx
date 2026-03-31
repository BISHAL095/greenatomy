import { Suspense, lazy, useState } from "react";
import Stats from "./components/Stats";
import LogsTable from "./components/LogsTable";
import "./App.css";

// Load chart bundle only when charts page is visited.
const ChartsPanel = lazy(() => import("./components/ChartsPanel"));

function App() {
  // Page-level navigation state for top navbar.
  const [currentPage, setCurrentPage] = useState("overview");
  // Logs page filter state.
  const [filters, setFilters] = useState({
    method: "",
    path: "",
    range: "24h",
    from: "",
    to: "",
    sort: "desc",
  });

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleRangeChange(value) {
    setFilters((current) => ({
      ...current,
      range: value,
      ...(value === "custom" ? {} : { from: "", to: "" }),
    }));
  }

  const overviewFilters = {
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
                  Basic platform metrics for the last 24 hours. Navigate to
                  Logs for route-level investigation and filtering.
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

        {currentPage === "logs" ? <LogsTable filters={filters} /> : null}
        {currentPage === "charts" ? (
          <Suspense fallback={<section className="stats-panel"><p className="empty-state">Loading charts...</p></section>}>
            <ChartsPanel />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
}

export default App;
