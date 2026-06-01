export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "greenatomy.auth.token";
const SESSION_STORAGE_KEY = "greenatomy.auth.session";
const USES_NGROK = API_BASE.includes(".ngrok-free.");

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredAuthToken(token) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, token);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures so logout/session cleanup does not crash the UI.
  }
}

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(session) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures so session cleanup does not crash the UI.
  }
}

// Prefix relative API paths when the frontend is pointing at a separate backend origin.
export function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

export function buildApiConfig(tokenOverride) {
  const authToken = tokenOverride ?? getStoredAuthToken();
  const headers = {};

  if (USES_NGROK) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return Object.keys(headers).length > 0 ? { headers } : {};
}
