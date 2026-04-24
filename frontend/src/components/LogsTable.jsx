import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { buildApiConfig, buildApiUrl } from "../lib/api";
import { buildLogsSearchParams } from "../lib/logFilters";

// Requests above this threshold are visually flagged for quick scanning.
const SLOW_REQUEST_THRESHOLD_MS = 1000;

function getStatusTone(statusCode) {
  const status = Number(statusCode);
  if (!Number.isFinite(status)) return "unknown";
  if (status >= 500) return "error";
  if (status >= 400) return "warning";
  if (status >= 200 && status < 400) return "success";
  return "unknown";
}

function LogsTable({ filters }) {
  const [rawLogs, setRawLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    // Reset pagination whenever the visible result set definition changes.
    setPage(1);
  }, [filters.method, filters.path, filters.range, filters.from, filters.to, filters.sort, pageSize]);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch a capped window once, then paginate and sort in the client for responsiveness.
        const params = buildLogsSearchParams(filters, { limit: 200 });

        const res = await axios.get(buildApiUrl(`/logs?${params.toString()}`), buildApiConfig());
        setRawLogs(res.data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          setError("Unauthorized. Set VITE_API_TOKEN to access protected routes.");
        } else {
          setError("Unable to load request logs.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters.method, filters.path, filters.range, filters.from, filters.to]);

  const sortedLogs = useMemo(() => {
    // Resort in memory so users can toggle chronology without another API call.
    const copy = [...rawLogs];
    copy.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return filters.sort === "asc" ? aTime - bTime : bTime - aTime;
    });
    return copy;
  }, [rawLogs, filters.sort]);

  const totalItems = sortedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  // Slice after sorting so every page reflects the requested chronology.
  const pageLogs = sortedLogs.slice(startIndex, startIndex + pageSize);

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

      <div className="table-controls">
        <p className="table-summary">
          {loading ? "Loading..." : `Showing ${pageLogs.length} of ${totalItems} logs`}
        </p>
        <label className="field compact">
          <span>Rows per page</span>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

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

            {!loading && pageLogs.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  No request logs match the current filters.
                </td>
              </tr>
            ) : null}

            {!loading
              ? pageLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={Number(log.durationMs) > SLOW_REQUEST_THRESHOLD_MS ? "row-slow" : ""}
                  >
                    <td>
                      <span className={`method-pill method-${log.method?.toLowerCase()}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="path-cell">{log.path}</td>
                    <td>
                      <span className={`status-pill status-${getStatusTone(log.statusCode)}`}>
                        {log.statusCode ?? "--"}
                      </span>
                    </td>
                    <td>
                      {log.durationMs} ms
                      {Number(log.durationMs) > SLOW_REQUEST_THRESHOLD_MS ? (
                        <span className="slow-badge">Slow</span>
                      ) : null}
                    </td>
                    <td>{Number(log.cpuUsedMs).toFixed(2)} ms</td>
                    <td>{Number(log.energyKwh).toFixed(6)} kWh</td>
                    <td>₹{Number(log.cost).toFixed(6)}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="pagination-row">
        <button
          type="button"
          className="pager-btn"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={loading || currentPage <= 1}
        >
          Prev
        </button>
        <p className="table-summary">
          Page {currentPage} of {totalPages}
        </p>
        <button
          type="button"
          className="pager-btn"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={loading || currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default LogsTable;
