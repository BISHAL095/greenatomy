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
  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }

  if (statusCode === 429) {
    return "RATE_LIMITED";
  }

  return "HTTP_ERROR";
}

async function request({ baseUrl, token, method, url, params }) {
  try {
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await axios({
      method,
      url: `${baseUrl}${url}`,
      params,
      timeout: 5000,
      headers,
    });

    return res.data;
  } catch (err) {
    if (err.response) {
      throw new GreenatomySdkError(err.response.data?.error || "Request failed", {
        statusCode: err.response.status,
        code: getHttpErrorCode(err.response.status),
        cause: err,
      });
    }

    if (err.code === "ECONNABORTED") {
      throw new GreenatomySdkError("Request timed out", {
        code: "TIMEOUT",
        cause: err,
      });
    }

    throw new GreenatomySdkError("Network error", {
      code: "NETWORK_ERROR",
      cause: err,
    });
  }
}

module.exports = request;
module.exports.GreenatomySdkError = GreenatomySdkError;
