import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildApiConfig, buildApiUrl } from "../lib/api";
import { buildLogsSearchParams } from "../lib/logFilters";

const RANGE_OPTIONS = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
];

const STATUS_COLORS = {
  "2xx/3xx": "#8ff0bd",
  "4xx": "#ffd089",
  "5xx": "#ff9f9f",
};

// Collapse timestamps into hourly or daily buckets depending on the selected window.
function getBucketStart(date, range) {
  const d = new Date(date);

  if (range === "24h") {
    d.setMinutes(0, 0, 0);
    return d;
  }

  d.setHours(0, 0, 0, 0);
  return d;
}

// Format bucket labels for chart axes without exposing raw timestamps.
function formatBucketLabel(bucketDate, range) {
  const date = new Date(bucketDate);

  if (range === "24h") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Group request latency into fixed bands for the distribution chart.
function getLatencyBucket(durationMs) {
  const d = Number(durationMs || 0);
  if (d < 200) return "<200ms";
  if (d < 500) return "200-500ms";
  if (d < 1000) return "500ms-1s";
  if (d < 2000) return "1s-2s";
  return ">2s";
}

// Aggregate logs into chart-ready time-series points.
function buildTimeSeries(logs, range) {
  const bucketMap = new Map();

  for (const log of logs) {
    const bucketStart = getBucketStart(log.createdAt, range).getTime();
    const current = bucketMap.get(bucketStart) || {
      ts: bucketStart,
      requests: 0,
      energy: 0,
      cost: 0,
      avgDurationMsTotal: 0,
    };

    current.requests += 1;
    current.energy += Number(log.energyKwh || 0);
    current.cost += Number(log.cost || 0);
    current.avgDurationMsTotal += Number(log.durationMs || 0);

    bucketMap.set(bucketStart, current);
  }

  return Array.from(bucketMap.values())
    .sort((a, b) => a.ts - b.ts)
    .map((point) => ({
      ...point,
      avgDurationMs: point.requests > 0 ? point.avgDurationMsTotal / point.requests : 0,
      label: formatBucketLabel(point.ts, range),
    }));
}

// Collapse raw status codes into coarse health bands for the pie chart.
function buildStatusSeries(logs) {
  let ok = 0;
  let warn = 0;
  let err = 0;

  for (const log of logs) {
    const code = Number(log.statusCode);
    if (code >= 500) err += 1;
    else if (code >= 400) warn += 1;
    else ok += 1;
  }

  return [
    { name: "2xx/3xx", value: ok },
    { name: "4xx", value: warn },
    { name: "5xx", value: err },
  ];
}

// Count how many requests land in each latency bucket.
function buildLatencySeries(logs) {
  const buckets = {
    "<200ms": 0,
    "200-500ms": 0,
    "500ms-1s": 0,
    "1s-2s": 0,
    ">2s": 0,
  };

  for (const log of logs) {
    const bucket = getLatencyBucket(log.durationMs);
    buckets[bucket] += 1;
  }

  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

function ChartsPanel({ range, onRangeChange }) {
  const [series, setSeries] = useState([]);
  const [statusSeries, setStatusSeries] = useState([]);
  const [latencySeries, setLatencySeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError("");

      try {
        // Charts use the same raw log feed and derive all visual series client-side.
        const params = buildLogsSearchParams({ range }, { limit: 200 });

        const res = await axios.get(buildApiUrl(`/logs?${params.toString()}`), buildApiConfig());
        const logs = Array.isArray(res.data) ? res.data : [];

        setSeries(buildTimeSeries(logs, range));
        setStatusSeries(buildStatusSeries(logs));
        setLatencySeries(buildLatencySeries(logs));
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          setError("Unauthorized. Please sign in to access chart data.");
        } else {
          setError("Unable to load chart data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [range]);

  const totals = useMemo(() => {
    // Surface compact totals above the visualizations for quick readouts.
    return series.reduce(
      (acc, point) => {
        acc.requests += point.requests;
        acc.energy += point.energy;
        acc.cost += point.cost;
        return acc;
      },
      { requests: 0, energy: 0, cost: 0 }
    );
  }, [series]);

  return (
    <section className="stats-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Charts</p>
          <h2>Telemetry trends</h2>
        </div>
        <label className="field compact">
          <span>Window</span>
          <select value={range} onChange={(e) => onRangeChange(e.target.value)}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}

      <div className="stats-grid" aria-busy={loading}>
        <article className="stat-card">
          <p className="stat-label">Requests in window</p>
          <p className="stat-value">{loading ? "--" : totals.requests}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Energy in window</p>
          <p className="stat-value">
            {loading ? "--" : totals.energy.toFixed(5)}
            <span>kWh</span>
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Cost in window</p>
          <p className="stat-value">
            {loading ? "--" : totals.cost.toFixed(5)}
            <span>INR</span>
          </p>
        </article>
      </div>

      <div className="chart-grid">
        <article className="chart-card">
          <p className="stat-label">Requests over time</p>
          <div className="chart-shell">
            {loading ? (
              <p className="empty-state">Loading chart...</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={series} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(220, 236, 228, 0.12)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#c8d8d0", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#c8d8d0", fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="#8ff0bd" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="chart-card">
          <p className="stat-label">Energy and cost trend</p>
          <div className="chart-shell">
            {loading ? (
              <p className="empty-state">Loading chart...</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={series} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(220, 236, 228, 0.12)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#c8d8d0", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#c8d8d0", fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="energy" stroke="#ffd089" fill="#ffd08933" />
                  <Area type="monotone" dataKey="cost" stroke="#ff9f9f" fill="#ff9f9f33" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="chart-card split">
          <div>
            <p className="stat-label">Status distribution</p>
            <div className="chart-shell">
              {loading ? (
                <p className="empty-state">Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Tooltip />
                    <Pie data={statusSeries} dataKey="value" nameKey="name" outerRadius={78} label>
                      {statusSeries.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div>
            <p className="stat-label">Latency distribution</p>
            <div className="chart-shell">
              {loading ? (
                <p className="empty-state">Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={latencySeries}>
                    <CartesianGrid stroke="rgba(220, 236, 228, 0.12)" strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" tick={{ fill: "#c8d8d0", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#c8d8d0", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8fc6ff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default ChartsPanel;
