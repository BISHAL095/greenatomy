require("dotenv").config();

const port = Number(process.env.PORT);
const rawCorsOrigin = process.env.CORS_ORIGIN;

function parseCorsOrigin(value) {
  if (!value || value === "*") {
    return true;
  }

  if (!value.includes(",")) {
    return value;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

module.exports = {
  port: Number.isFinite(port) && port > 0 ? port : 3000,
  corsOrigin: parseCorsOrigin(rawCorsOrigin),
};
