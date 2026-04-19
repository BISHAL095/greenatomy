const axios = require("axios");

class GreenatomySdkError extends Error {
  constructor(message, { statusCode, code, cause } = {}) {
    super(message);
    this.name = "GreenatomySdkError";
    this.statusCode = statusCode;
    this.code = code;
    this.cause = cause;
  }
}

function getHttpErrorCode(statusCode) {
  // Surface the most actionable HTTP cases with stable SDK-level codes.
  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }

  if (statusCode === 429) {
    return "RATE_LIMITED";
  }

  return "HTTP_ERROR";
}

async function request({ baseUrl, token, apiKey, timeout = 5000, method, url, params }) {
  try {
    const headers = {};

    // Support either bearer auth, API-key auth, or both when the server accepts both headers.
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const res = await axios({
      method,
      url: `${baseUrl}${url}`,
      params,
      timeout,
      headers,
    });

    return res.data;
  } catch (err) {
    if (err.response) {
      // Preserve server-provided messages while translating status codes into SDK error codes.
      throw new GreenatomySdkError(err.response.data?.error || "Request failed", {
        statusCode: err.response.status,
        code: getHttpErrorCode(err.response.status),
        cause: err,
      });
    }

    if (err.code === "ECONNABORTED") {
      // Axios uses ECONNABORTED for request timeouts.
      throw new GreenatomySdkError("Request timed out", {
        code: "TIMEOUT",
        cause: err,
      });
    }

    // Anything else is treated as a transport-level failure outside normal HTTP handling.
    throw new GreenatomySdkError("Network error", {
      code: "NETWORK_ERROR",
      cause: err,
    });
  }
}

module.exports = request;
module.exports.GreenatomySdkError = GreenatomySdkError;
