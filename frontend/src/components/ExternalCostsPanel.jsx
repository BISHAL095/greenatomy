import { useEffect, useState } from "react";
import axios from "axios";
import { buildApiConfig, buildApiUrl, getStoredAuthToken } from "../lib/api";

const GROUP_OPTIONS = [
  { value: "provider", label: "Provider" },
  { value: "label",    label: "Label" },
];

function BreakdownTable({ rows, groupBy }) {
  if (!rows.length) {
    return <p className="empty-state">No external API costs recorded in this range.</p>;
  }

  return (
    <div className="api-key-table-shell">
      <div className="api-key-table-head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
        <span>{groupBy === "label" ? "Label" : "Provider"}</span>
        <span>Total cost (USD)</span>
        <span>Requests</span>
        <span>Avg / request</span>
      </div>
      <div className="api-key-list">
        {rows.map((row) => (
          <article
            className="api-key-row"
            key={row[groupBy] ?? "unknown"}
            style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
          >
            <strong className="api-key-name-cell">
              {row[groupBy] ?? <span style={{ opacity: 0.45 }}>unlabelled</span>}
            </strong>
            <span className="api-key-meta">${row.totalCostUsd.toFixed(6)}</span>
            <span className="api-key-meta">{row.requestCount.toLocaleString()}</span>
            <span className="api-key-meta">${row.avgCostPerRequest.toFixed(6)}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function TotalBar({ rows }) {
  const total = rows.reduce((sum, r) => sum + r.totalCostUsd, 0);
  const topRow = rows[0];

  if (!rows.length) return null;

  return (
    <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
      <div className="stat-card">
        <p className="stat-label">Total external spend</p>
        <p className="stat-value">${total.toFixed(4)}</p>
      </div>
      <div className="stat-card">
        <p className="stat-label">Providers / labels tracked</p>
        <p className="stat-value">{rows.length}</p>
      </div>
      {topRow ? (
        <div className="stat-card">
          <p className="stat-label">Top spender</p>
          <p className="stat-value" style={{ fontSize: "1rem" }}>
            {topRow.provider ?? topRow.label ?? "—"}
          </p>
          <p className="stat-subvalue">${topRow.totalCostUsd.toFixed(4)}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function ExternalCostsPanel({ projectId, environment, range, from, to }) {
  const [groupBy, setGroupBy] = useState("provider");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    const token = getStoredAuthToken();
    const params = new URLSearchParams({ groupBy, range, environment, projectId });
    if (range === "custom" && from) params.set("from", from);
    if (range === "custom" && to)   params.set("to", to);

    async function fetchBreakdown() {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(
          buildApiUrl(`/logs/external-breakdown?${params}`),
          buildApiConfig(token)
        );
        if (!cancelled) setRows(res.data || []);
      } catch (err) {
        if (!cancelled)
          setError(err?.response?.data?.error || "Failed to load external cost breakdown.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBreakdown();
    return () => { cancelled = true; };
  }, [projectId, environment, range, from, to, groupBy]);

  return (
    <section className="stats-panel">
      <div className="section-heading keys-heading">
        <div>
          <p className="eyebrow">External costs</p>
          <h2>Third-party API spend</h2>
          <p className="hero-text">
            Breakdown of costs attributed to external providers.
          </p>
        </div>
        <label className="inline-field" style={{ minWidth: 140 }}>
          <span>Group by</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}

      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : (
        <>
          <TotalBar rows={rows} />
          <BreakdownTable rows={rows} groupBy={groupBy} />
        </>
      )}
    </section>
  );
}
