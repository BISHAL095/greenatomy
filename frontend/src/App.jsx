import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Stats from "./components/Stats";
import LogsTable from "./components/LogsTable";
import {
  buildApiUrl,
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from "./lib/api";
import "./App.css";

// Defer the chart bundle until the charts view is actually opened.
const ChartsPanel = lazy(() => import("./components/ChartsPanel"));

const VALID_PAGES = new Set(["overview", "logs", "charts", "keys"]);
const VALID_RANGES = new Set(["24h", "7d", "30d", "all", "custom"]);
const VALID_SORTS = new Set(["asc", "desc"]);
const VALID_CHART_RANGES = new Set(["24h", "7d", "30d"]);
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "logs", label: "Logs", icon: "logs" },
  { id: "charts", label: "Charts", icon: "charts" },
  { id: "keys", label: "Keys", icon: "keys" },
];

function NavIcon({ kind }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.85",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (kind) {
    case "overview":
      return (
        <svg {...common}>
          <path d="M4 13.5 12 5l8 8.5" />
          <path d="M6.5 11.5V20h11v-8.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "logs":
      return (
        <svg {...common}>
          <path d="M7 6h10" />
          <path d="M7 12h10" />
          <path d="M7 18h6" />
          <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "charts":
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-7" />
        </svg>
      );
    case "keys":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="12" r="3.5" />
          <path d="M12 12h8" />
          <path d="M17 12v3" />
          <path d="M20 12v2" />
        </svg>
      );
    default:
      return null;
  }
}

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

function AuthScreen({ mode, onModeChange, onAuthenticated }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    projectName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "register"
          ? {
              email: form.email,
              password: form.password,
              projectName: form.projectName,
            }
          : {
              email: form.email,
              password: form.password,
            };

      const res = await axios.post(buildApiUrl(endpoint), payload);
      onAuthenticated(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to complete authentication.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Account</p>
          <h1>{mode === "register" ? "Create your Greenatomy workspace" : "Sign in to your workspace"}</h1>
          <p className="hero-text">
            {mode === "register"
              ? "Create an account and default project so your hosted dashboard can grow beyond the single shared token model."
              : "Use your account to access the hosted dashboard with a signed session instead of a static admin token."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              placeholder="At least 8 characters"
              required
            />
          </label>

          {mode === "register" ? (
            <label className="field">
              <span>Project name</span>
              <input
                value={form.projectName}
                onChange={(e) => setForm((current) => ({ ...current, projectName: e.target.value }))}
                placeholder="Default project"
              />
            </label>
          ) : null}

          {error ? <p className="status-banner error">{error}</p> : null}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
          </button>

          <button
            type="button"
            className="auth-switch"
            onClick={() => onModeChange(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "Already have an account? Sign in" : "Need an account? Register"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [dashboardState, setDashboardState] = useState(readDashboardState);
  const [authMode, setAuthMode] = useState("login");
  const [sessionToken, setSessionToken] = useState(getStoredAuthToken);
  const [sessionUser, setSessionUser] = useState(null);
  const [sessionProjects, setSessionProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysError, setApiKeysError] = useState("");
  const [freshApiKey, setFreshApiKey] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectFormLoading, setProjectFormLoading] = useState(false);
  const [projectFormError, setProjectFormError] = useState("");
  const { currentPage, filters, chartRange } = dashboardState;
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    let cancelled = false;

    axios
      .get(buildApiUrl("/auth/me"), {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })
      .then((res) => {
        if (!cancelled) {
          setSessionUser(res.data.user);
          setSessionProjects(res.data.projects || []);
          setSelectedProjectId((current) => current || res.data.projects?.[0]?.id || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearStoredAuthToken();
          setSessionToken("");
          setSessionUser(null);
          setSessionProjects([]);
          setSelectedProjectId("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken || !selectedProjectId) {
      return;
    }

    let cancelled = false;

    axios
      .get(buildApiUrl(`/auth/projects/${selectedProjectId}/keys`), {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })
      .then((res) => {
        if (!cancelled) {
          setApiKeys(res.data.apiKeys || []);
          setApiKeysError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setApiKeysError(err?.response?.data?.error || "Unable to load API keys.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setApiKeysLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken, selectedProjectId]);

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

  const overviewFilters = useMemo(
    () => ({
      // The overview is intentionally pinned to all-time aggregates.
      projectId: selectedProjectId,
      method: "",
      path: "",
      range: "all",
      from: "",
      to: "",
      sort: "desc",
    }),
    [selectedProjectId]
  );

  const currentProject = useMemo(
    () => sessionProjects.find((project) => project.id === selectedProjectId) || null,
    [sessionProjects, selectedProjectId]
  );

  function handleAuthenticated(payload) {
    if (!payload?.token) {
      return;
    }

    setStoredAuthToken(payload.token);
    setSessionToken(payload.token);
    setSessionUser(payload.user || null);
    setSessionProjects(payload.project ? [payload.project] : []);
    setSelectedProjectId(payload.project?.id || "");
    setApiKeys([]);
    setApiKeysError("");
    setApiKeysLoading(Boolean(payload.project?.id));
    setFreshApiKey("");
    setShowProjectForm(false);
    setNewProjectName("");
    setProjectFormError("");
  }

  function handleLogout() {
    clearStoredAuthToken();
    setSessionToken("");
    setSessionUser(null);
    setSessionProjects([]);
    setSelectedProjectId("");
    setApiKeys([]);
    setApiKeysError("");
    setApiKeysLoading(false);
    setFreshApiKey("");
    setShowProjectForm(false);
    setNewProjectName("");
    setProjectFormError("");
  }

  async function handleAddProject(event) {
    event.preventDefault();
    const name = newProjectName.trim();

    if (!name) {
      setProjectFormError("Project name is required.");
      return;
    }

    setProjectFormLoading(true);
    setProjectFormError("");

    try {
      const res = await axios.post(
        buildApiUrl("/auth/projects"),
        { name },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      const nextProject = res.data?.project;
      if (!nextProject) {
        return;
      }

      setSessionProjects((current) => [...current, nextProject]);
      setSelectedProjectId(nextProject.id);
      setApiKeys([]);
      setApiKeysError("");
      setApiKeysLoading(true);
      setFreshApiKey("");
      setShowProjectForm(false);
      setNewProjectName("");
      setProjectFormError("");
    } catch (err) {
      setProjectFormError(err?.response?.data?.error || "Unable to create project.");
    } finally {
      setProjectFormLoading(false);
    }
  }

  async function handleCreateApiKey() {
    if (!selectedProjectId) {
      window.alert("Select a project first.");
      return;
    }

    try {
      const res = await axios.post(
        buildApiUrl(`/auth/projects/${selectedProjectId}/keys`),
        {},
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      setApiKeys((current) => [res.data.apiKey, ...current]);
      setFreshApiKey(res.data.rawKey || "");
    } catch (err) {
      window.alert(err?.response?.data?.error || "Unable to create API key.");
    }
  }

  async function handleRevokeApiKey(keyId) {
    if (!selectedProjectId) {
      return;
    }

    try {
      const res = await axios.post(
        buildApiUrl(`/auth/projects/${selectedProjectId}/keys/${keyId}/revoke`),
        {},
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      setApiKeys((current) =>
        current.map((apiKey) => (apiKey.id === keyId ? res.data.apiKey : apiKey))
      );
    } catch (err) {
      window.alert(err?.response?.data?.error || "Unable to revoke API key.");
    }
  }

  if (!sessionToken) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="site-brand">
            <p className="eyebrow">Green-Ops Monitor</p>
            <p className="brand-title">Carbon-aware backend telemetry</p>
          </div>

          <nav className="page-nav" aria-label="Dashboard pages">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`page-link sidebar-link ${currentPage === item.id ? "active" : ""}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <span className="page-link-icon">
                  <NavIcon kind={item.icon} />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="dashboard-main">
          <header className="site-navbar">
            <div className="navbar-top">
              <div className="header-panel project-panel">
                <div className="project-heading">
                  <p className="project-title">Project</p>
                  <p className="project-name">{currentProject?.name || "No project selected"}</p>
                </div>
                <div className="project-controls">
                  <label className="project-picker">
                    <span>Choose project</span>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        setApiKeys([]);
                        setApiKeysError("");
                        setApiKeysLoading(Boolean(e.target.value));
                        setFreshApiKey("");
                      }}
                    >
                      {sessionProjects.length > 0 ? (
                        sessionProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No projects yet</option>
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={`add-project-btn ${showProjectForm ? "active" : ""}`}
                    onClick={() => {
                      setShowProjectForm((current) => !current);
                      setNewProjectName("");
                      setProjectFormError("");
                    }}
                  >
                    {showProjectForm ? "Close" : "Add project"}
                  </button>
                </div>
              </div>
              <div className="header-panel account-panel">
                <p className="session-copy">
                  {sessionUser?.email || "Authenticated session"}
                </p>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
            {showProjectForm ? (
              <form className="project-inline-form" onSubmit={handleAddProject}>
                <label className="field project-inline-field">
                  <span>New project</span>
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Production API"
                    autoFocus
                  />
                </label>
                <div className="project-inline-actions">
                  <button type="submit" className="add-project-btn" disabled={projectFormLoading}>
                    {projectFormLoading ? "Creating..." : "Create project"}
                  </button>
                  <button
                    type="button"
                    className="project-cancel-btn"
                    onClick={() => {
                      setShowProjectForm(false);
                      setNewProjectName("");
                      setProjectFormError("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {projectFormError ? <p className="status-banner error">{projectFormError}</p> : null}
              </form>
            ) : null}
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
              <div className="hero-card">
                <p className="hero-card-label">Project access</p>
                <p className="hero-text">
                  Switch projects from the header, then open the Keys page to generate SDK credentials and revoke old ones.
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

        {currentPage === "logs" ? (
          <LogsTable filters={{ ...deferredFilters, projectId: selectedProjectId }} />
        ) : null}
        {currentPage === "charts" ? (
          <Suspense fallback={<section className="stats-panel"><p className="empty-state">Loading charts...</p></section>}>
            <ChartsPanel
              projectId={selectedProjectId}
              range={chartRange}
              onRangeChange={handleChartRangeChange}
            />
          </Suspense>
        ) : null}
        {currentPage === "keys" ? (
          <section className="stats-panel">
            <div className="section-heading keys-heading">
              <div>
                <p className="eyebrow">Keys</p>
                <h2>Project API keys</h2>
              </div>
              <button type="button" className="add-project-btn" onClick={handleCreateApiKey}>
                Create API key
              </button>
            </div>

            {freshApiKey ? (
              <div className="status-banner success">
                Save this key now: <code>{freshApiKey}</code>
              </div>
            ) : null}
            {apiKeysError ? <p className="status-banner error">{apiKeysError}</p> : null}

            <section className="api-key-table-shell">
              <div className="api-key-table-head">
                <span>Name</span>
                <span>Created</span>
                <span>Status</span>
                <span>Delete</span>
              </div>

              {apiKeysLoading ? (
                <p className="empty-state">Loading API keys...</p>
              ) : apiKeys.length > 0 ? (
                <div className="api-key-list">
                  {apiKeys.map((apiKey, index) => (
                    <article className="api-key-row" key={apiKey.id}>
                      <div className="api-key-name-cell">
                        <strong>{`Key ${index + 1}`}</strong>
                        <span>{apiKey.preview}</span>
                      </div>
                      <span className="api-key-meta">
                        {apiKey.createdAt
                          ? new Date(apiKey.createdAt).toLocaleDateString()
                          : "--"}
                      </span>
                      <span className={`api-key-status ${apiKey.revokedAt ? "revoked" : "active"}`}>
                        {apiKey.revokedAt ? "Revoked" : "Active"}
                      </span>
                      <div className="api-key-delete-cell">
                        {!apiKey.revokedAt ? (
                          <button
                            type="button"
                            className="revoke-key-btn"
                            onClick={() => handleRevokeApiKey(apiKey.id)}
                            aria-label={`Revoke key ${index + 1}`}
                          >
                            ×
                          </button>
                        ) : (
                          <span className="api-key-delete-placeholder">--</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No API keys yet.</p>
              )}
            </section>
          </section>
        ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
