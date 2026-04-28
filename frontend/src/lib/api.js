export const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const AUTH_STORAGE_KEY = "greenatomy.auth.token";

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "";
}

export function setStoredAuthToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearStoredAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
