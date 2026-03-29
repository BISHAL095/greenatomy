import { useEffect, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../lib/api";

function LogsTable({ filters }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ limit: "10" });

        if (filters.method) {
          params.set("method", filters.method);
        }

        if (filters.path) {
          params.set("path", filters.path);
        }

        const res = await axios.get(buildApiUrl(`/logs?${params.toString()}`));
        setLogs(res.data);
      } catch (err) {
        setError("Unable to load request logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters]);

  return (
    <section className="table-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent activity</p>
          <h2>Request telemetry</h2>
        </div>
        <p className="section-copy">
          Latest API calls recorded by the backend estimator middleware.
        </p>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Status</th>
              <th>Duration</th>
              <th>CPU</th>
              <th>Energy</th>
              <th>Cost</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  Loading recent logs...
                </td>
              </tr>
            ) : null}

            {!loading && logs.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  No request logs match the current filters.
                </td>
              </tr>
            ) : null}

            {!loading
              ? logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`method-pill method-${log.method?.toLowerCase()}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="path-cell">{log.path}</td>
                    <td>{log.statusCode ?? "--"}</td>
                    <td>{log.durationMs} ms</td>
                    <td>{Number(log.cpuUsedMs).toFixed(2)} ms</td>
                    <td>{Number(log.energyKwh).toFixed(6)} kWh</td>
                    <td>₹{Number(log.cost).toFixed(6)}</td>
                    <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default LogsTable;
