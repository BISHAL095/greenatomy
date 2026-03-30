import { useState } from "react";
import Stats from "./components/Stats";
import LogsTable from "./components/LogsTable";
import "./App.css";

function App() {
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

  return (
    <main className="dashboard">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Green-Ops Monitor</p>
          <h1>Carbon-aware backend telemetry for every request.</h1>
          <p className="hero-text">
            Track response time, CPU usage, estimated electricity consumption,
            and cost from a single operational dashboard.
          </p>
        </div>

        <div className="hero-card">
          <p className="hero-card-label">Active filters</p>
          <div className="filters">
            <label className="field">
              <span>HTTP method</span>
              <input
                value={filters.method}
                placeholder="GET"
                onChange={(e) => updateFilter("method", e.target.value.toUpperCase())}
              />
            </label>

            <label className="field">
              <span>Request path</span>
              <input
                value={filters.path}
                placeholder="/heavy"
                onChange={(e) => updateFilter("path", e.target.value)}
              />
            </label>

            <label className="field">
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
                <label className="field">
                  <span>From</span>
                  <input
                    type="datetime-local"
                    value={filters.from}
                    onChange={(e) => updateFilter("from", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>To</span>
                  <input
                    type="datetime-local"
                    value={filters.to}
                    onChange={(e) => updateFilter("to", e.target.value)}
                  />
                </label>
              </>
            ) : null}

            <label className="field">
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
        </div>
      </section>

      <Stats filters={filters} />
      <LogsTable filters={filters} />
    </main>
  );
}

export default App;
