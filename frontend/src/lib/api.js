export const API_BASE = import.meta.env.VITE_API_BASE ?? "";
export const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? "";

// Build absolute API URL using configured backend base.
export function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

export function buildApiConfig() {
  // Keep requests unauthenticated in local dev when token is not configured.
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
