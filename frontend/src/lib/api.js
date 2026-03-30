export const API_BASE = import.meta.env.VITE_API_BASE ?? "";
export const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? "";

export function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

export function buildApiConfig() {
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
