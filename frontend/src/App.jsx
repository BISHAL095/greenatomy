import { useState } from "react";
import Stats from "./components/Stats";
import LogsTable from "./components/LogsTable";
import "./App.css";

function App() {
  const [filters, setFilters] = useState({ method: "", path: "" });

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
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
