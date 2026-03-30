import { useEffect, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../lib/api";

function Stats({ filters }) {
  const [stats, setStats] = useState({
    totalRequests: 0,
    avgDurationMs: 0,
    totalEnergyKwh: 0,
    totalCost: 0,
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

        const res = await axios.get(buildApiUrl(`/logs/stats?${params.toString()}`));
        setStats(res.data);
      } catch (err) {
        console.log(err);
        setError("Unable to load dashboard stats.");
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
    },
    {
      label: "Avg latency",
      value: Number(stats.avgDurationMs ?? 0).toFixed(2),
      suffix: "ms",
    },
    {
      label: "Energy tracked",
      value: Number(stats.totalEnergyKwh ?? 0).toFixed(6),
      suffix: "kWh",
    },
    {
      label: "Estimated cost",
      value: Number(stats.totalCost ?? 0).toFixed(6),
      suffix: "INR",
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
          </article>
        ))}
      </div>
    </section>
  );
}

export default Stats;
