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

function parseMysqlFromEnv() {
  const rawUrl = process.env.MYSQL_URL || 'localhost';

  // Supports either:
  //  - hostname (e.g., "localhost" or "db")
  //  - full URI (e.g., "mysql://localhost:5000/myapp")
  // If URI is provided, it can optionally override host/port/db (unless explicit env vars exist).
  let host = rawUrl;
  let port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : undefined;
  let database = process.env.MYSQL_DB;

  if (/^mysql:\/\//i.test(rawUrl)) {
    try {
      const u = new URL(rawUrl);
      host = u.hostname;

      // Only take from URL when explicit env vars are not present
      if (!port && u.port) port = Number(u.port);
      if (!database && u.pathname && u.pathname !== '/') {
        database = u.pathname.replace(/^\//, '');
      }
    } catch (_e) {
      // If MYSQL_URL is malformed, keep it as-is; pool.js will surface a clear error.
      host = rawUrl;
    }
  }

  return {
    host,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database,
    port,
  };
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

  mysql: parseMysqlFromEnv(),

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
