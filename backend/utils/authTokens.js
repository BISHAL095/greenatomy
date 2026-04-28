const crypto = require("crypto");
const env = require("../config/env");

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function sign(input) {
  return crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(input)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createAuthToken(payload) {
  if (!env.authTokenSecret) {
    throw new Error("AUTH_TOKEN_SECRET or AUTH_TOKEN must be configured");
  }

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + env.authTokenTtlSeconds;
  const body = encodeBase64Url(JSON.stringify({ ...payload, exp }));
  const signature = sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || !env.authTokenSecret) {
    return null;
  }

  const [header, body, signature] = String(token).split(".");
  if (!header || !body || !signature) {
    return null;
  }

  const expectedSignature = sign(`${header}.${body}`);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  createAuthToken,
  verifyAuthToken,
};
