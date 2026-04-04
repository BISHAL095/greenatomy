const request = require("./http");
const { GreenatomySdkError } = request;

class GreenatomyClient {
  constructor({ baseUrl, token } = {}) {
    if (!baseUrl || typeof baseUrl !== "string") {
      throw new TypeError("GreenatomyClient requires a valid baseUrl");
    }

    if (!token || typeof token !== "string") {
      throw new TypeError("GreenatomyClient requires a valid token");
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  async getLogs(params = {}) {
    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      method: "GET",
      url: "/logs",
      params,
    });
  }

  async getStats(params = {}) {
    return request({
      baseUrl: this.baseUrl,
      token: this.token,
      method: "GET",
      url: "/logs/stats",
      params,
    });
  }
}

module.exports = GreenatomyClient;
module.exports.GreenatomySdkError = GreenatomySdkError;
