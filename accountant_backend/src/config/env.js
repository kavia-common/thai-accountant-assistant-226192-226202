const dotenv = require('dotenv');

dotenv.config();

/**
 * Parses a boolean-like env var value.
 * Accepts: true/1/yes/on (case-insensitive).
 */
function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

/**
 * Parses a comma-separated env var.
 */
function parseCsv(value, defaultValue = []) {
  if (!value) return defaultValue;
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '0.0.0.0',

  cors: {
    // For this project we allow the frontend on :3000 + configured origins.
    // If ALLOWED_ORIGINS is missing, default to localhost + *internal* URLs from env.
    allowedOrigins: parseCsv(process.env.ALLOWED_ORIGINS, [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]),
    allowedHeaders: parseCsv(process.env.ALLOWED_HEADERS, [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ]),
    allowedMethods: parseCsv(process.env.ALLOWED_METHODS, [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS',
    ]),
    maxAge: Number(process.env.CORS_MAX_AGE || 3600),
  },

  mysql: {
    // IMPORTANT: these are the required DB env vars from the database container definition.
    // Please ensure these are set in accountant_backend/.env by the orchestrator:
    // MYSQL_URL, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
    host: process.env.MYSQL_URL || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : undefined,
  },

  ai: {
    // When false/missing -> fall back to heuristic classification
    enabled: parseBool(process.env.AI_CLASSIFICATION_ENABLED, false),
  },
};

module.exports = {
  config,
  parseBool,
  parseCsv,
};
