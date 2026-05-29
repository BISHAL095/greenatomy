export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "greenatomy.auth.token";

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

// Prefix relative API paths when the frontend is pointing at a separate backend origin.
export function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

export function buildApiConfig() {
  const authToken = getStoredAuthToken();

  if (authToken) {
    return {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
  }

  return {};
}
