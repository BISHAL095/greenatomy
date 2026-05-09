const crypto = require("crypto");

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(String(rawKey)).digest("hex");
}

function generateApiKey() {
  return `ga_live_${crypto.randomBytes(18).toString("hex")}`;
}

function maskApiKey(rawKey) {
  const value = String(rawKey || "");
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

module.exports = {
  generateApiKey,
  hashApiKey,
  maskApiKey,
};
