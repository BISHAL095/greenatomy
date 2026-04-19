export const API_BASE = import.meta.env.VITE_API_BASE ?? "";
export const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? "";

// Prefix relative API paths when the frontend is pointing at a separate backend origin.
export function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

export function buildApiConfig() {
  // Skip auth headers in local development unless an API token is explicitly configured.
  if (!API_TOKEN) {
    return {};
  }

  return {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "x-api-key": API_TOKEN,
    },
  };
}
