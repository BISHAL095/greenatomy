import { useEffect, useState } from "react";
import axios from "axios";
import { buildApiConfig, buildApiUrl } from "../lib/api";

const RANGE_TO_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function getWindowRange(filters) {
  if (filters.range === "all") {
    return { from: null, to: null, windowMs: null };
  }

  if (filters.range === "custom" && filters.from && filters.to) {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    const diff = to.getTime() - from.getTime();
    if (Number.isFinite(diff) && diff > 0) {
      return { from, to, windowMs: diff };
    }
  }

  const windowMs = RANGE_TO_MS[filters.range] || RANGE_TO_MS["24h"];
  const to = new Date();
  const from = new Date(to.getTime() - windowMs);
  return { from, to, windowMs };
}

function calculateMetrics(logs) {
  const totalRequests = logs.length;
  const totalDuration = logs.reduce((sum, log) => sum + Number(log.durationMs || 0), 0);
  const totalCost = logs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
  const errors = logs.filter((log) => Number(log.statusCode) >= 500).length;

  return {
    totalRequests,
    avgDurationMs: totalRequests > 0 ? totalDuration / totalRequests : 0,
    totalCost,
    errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
  };
}

function calculateDelta(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function Stats({ filters }) {
  const [stats, setStats] = useState({
    totalRequests: 0,
    avgDurationMs: 0,
    totalEnergyKwh: 0,
    totalCost: 0,
  });
  const [insights, setInsights] = useState({
    errorRate: 0,
    lastSeenAt: "",
    topRoutes: [],
    topSlowRoutes: [],
    messages: [],
    deltas: {
      requests: null,
      latency: null,
      cost: null,
      errorRate: null,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (filters.method) {
          params.set("method", filters.method);
        }

        if (filters.path) {
          params.set("path", filters.path);
        }

        if (filters.range === "custom") {
          if (filters.from) {
            params.set("from", new Date(filters.from).toISOString());
          }

          if (filters.to) {
            params.set("to", new Date(filters.to).toISOString());
          }
        } else if (filters.range) {
          params.set("range", filters.range);
        }

        const res = await axios.get(
          buildApiUrl(`/logs/stats?${params.toString()}`),
          buildApiConfig()
        );
        setStats(res.data);

        const logsRes = await axios.get(
          buildApiUrl(`/logs?${params.toString()}&limit=200`),
          buildApiConfig()
        );

        const logs = Array.isArray(logsRes.data) ? logsRes.data : [];
        const currentMetrics = calculateMetrics(logs);
        const errors = logs.filter((log) => Number(log.statusCode) >= 500).length;
        const errorRate = logs.length ? (errors / logs.length) * 100 : 0;
        const lastSeenAt = logs[0]?.createdAt || "";

        const routeMap = new Map();
        const slowRouteMap = new Map();
        for (const log of logs) {
          const key = `${log.method || "UNK"} ${log.path || "/"}`;
          const current = routeMap.get(key) || { key, totalCost: 0, hits: 0 };
          current.totalCost += Number(log.cost || 0);
          current.hits += 1;
          routeMap.set(key, current);

          const slowCurrent = slowRouteMap.get(key) || {
            key,
            totalDurationMs: 0,
            hits: 0,
          };
          slowCurrent.totalDurationMs += Number(log.durationMs || 0);
          slowCurrent.hits += 1;
          slowRouteMap.set(key, slowCurrent);
        }

        const topRoutes = Array.from(routeMap.values())
          .sort((a, b) => b.totalCost - a.totalCost)
          .slice(0, 3);

        const topSlowRoutes = Array.from(slowRouteMap.values())
          .map((route) => ({
            ...route,
            avgDurationMs: route.hits > 0 ? route.totalDurationMs / route.hits : 0,
          }))
          .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
          .slice(0, 3);

        const { from, windowMs } = getWindowRange(filters);
        let deltas = {
          requests: null,
          latency: null,
          cost: null,
          errorRate: null,
        };

        if (from && windowMs) {
          const prevTo = new Date(from.getTime());
          const prevFrom = new Date(prevTo.getTime() - windowMs);

          const prevParams = new URLSearchParams();
          if (filters.method) prevParams.set("method", filters.method);
          if (filters.path) prevParams.set("path", filters.path);
          prevParams.set("from", prevFrom.toISOString());
          prevParams.set("to", prevTo.toISOString());
          prevParams.set("limit", "200");

          const prevLogsRes = await axios.get(
            buildApiUrl(`/logs?${prevParams.toString()}`),
            buildApiConfig()
          );
          const prevLogs = Array.isArray(prevLogsRes.data) ? prevLogsRes.data : [];
          const prevMetrics = calculateMetrics(prevLogs);

          deltas = {
            requests: calculateDelta(currentMetrics.totalRequests, prevMetrics.totalRequests),
            latency: calculateDelta(currentMetrics.avgDurationMs, prevMetrics.avgDurationMs),
            cost: calculateDelta(currentMetrics.totalCost, prevMetrics.totalCost),
            errorRate: calculateDelta(currentMetrics.errorRate, prevMetrics.errorRate),
          };
        }

        const messages = [];
        if (errorRate > 5) {
          messages.push(`High error rate detected (${errorRate.toFixed(2)}%).`);
        }
        if (topSlowRoutes[0]?.avgDurationMs > 1000) {
          messages.push(
            `Slow route hotspot: ${topSlowRoutes[0].key} averaging ${topSlowRoutes[0].avgDurationMs.toFixed(0)} ms.`
          );
        }
        if (topRoutes[0] && currentMetrics.totalCost > 0) {
          const topShare = (topRoutes[0].totalCost / currentMetrics.totalCost) * 100;
          if (topShare > 40) {
            messages.push(
              `Cost concentration: ${topRoutes[0].key} contributes ${topShare.toFixed(1)}% of total cost.`
            );
          }
        }
        if (filters.range === "all") {
          messages.push("Overview is showing all-time totals and aggregates.");
        } else if (messages.length === 0) {
          messages.push("System health is stable in the selected window.");
        }

        setInsights({
          errorRate,
          lastSeenAt,
          topRoutes,
          topSlowRoutes,
          messages,
          deltas,
        });
      } catch (err) {
        console.log(err);
        const status = err?.response?.status;
        if (status === 401) {
          setError("Unauthorized. Set VITE_API_TOKEN to access protected routes.");
        } else {
          setError("Unable to load dashboard stats.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [filters]);

  const cards = [
    {
      label: "Requests",
      value: stats.totalRequests ?? 0,
      suffix: "",
      delta: insights.deltas.requests,
    },
    {
      label: "Avg latency",
      value: Number(stats.avgDurationMs ?? 0).toFixed(2),
      suffix: "ms",
      delta: insights.deltas.latency,
    },
    {
      label: "Energy tracked",
      value: Number(stats.totalEnergyKwh ?? 0).toFixed(6),
      suffix: "kWh",
      delta: null,
    },
    {
      label: "Estimated cost",
      value: Number(stats.totalCost ?? 0).toFixed(6),
      suffix: "INR",
      delta: insights.deltas.cost,
    },
  ];

  return (
    <section className="stats-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Live efficiency snapshot</h2>
        </div>
        <p className="section-copy">
          Request volume, latency, energy usage, and operating cost based on the
          current filter set.
        </p>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}

      <div className="stats-grid" aria-busy={loading}>
        {cards.map((card) => (
          <article className="stat-card" key={card.label}>
            <p className="stat-label">{card.label}</p>
            <p className="stat-value">
              {loading ? "--" : card.value}
              {card.suffix ? <span>{card.suffix}</span> : null}
            </p>
            {!loading && card.delta !== null ? (
              <p className={`delta-pill ${card.delta >= 0 ? "up" : "down"}`}>
                {card.delta >= 0 ? "+" : ""}
                {card.delta.toFixed(1)}% vs previous window
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <section className="overview-insights">
        <article className="insight-card">
          <p className="stat-label">Error rate</p>
          <p className="stat-value">
            {loading ? "--" : `${insights.errorRate.toFixed(2)}%`}
          </p>
        </article>

        <article className="insight-card">
          <p className="stat-label">Data freshness</p>
          <p className="insight-copy">
            {loading
              ? "--"
              : insights.lastSeenAt
                ? `Last event at ${new Date(insights.lastSeenAt).toLocaleString()}`
                : "No events in selected range"}
          </p>
        </article>

        <article className="insight-card">
          <p className="stat-label">Top costly routes</p>
          {loading ? (
            <p className="insight-copy">--</p>
          ) : insights.topRoutes.length > 0 ? (
            <ul className="top-route-list">
              {insights.topRoutes.map((route) => (
                <li key={route.key}>
                  <span>{route.key}</span>
                  <strong>₹{route.totalCost.toFixed(5)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="insight-copy">No route data available.</p>
          )}
        </article>

        <article className="insight-card">
          <p className="stat-label">Top slow routes</p>
          {loading ? (
            <p className="insight-copy">--</p>
          ) : insights.topSlowRoutes.length > 0 ? (
            <ul className="top-route-list">
              {insights.topSlowRoutes.map((route) => (
                <li key={route.key}>
                  <span>{route.key}</span>
                  <strong>{route.avgDurationMs.toFixed(0)} ms</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="insight-copy">No route data available.</p>
          )}
        </article>
      </section>

      <section className="insight-callouts">
        <p className="stat-label">Key insights</p>
        <ul className="insight-list">
          {loading ? <li>Loading insights...</li> : insights.messages.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      </section>
    </section>
  );
}

export default Stats;
