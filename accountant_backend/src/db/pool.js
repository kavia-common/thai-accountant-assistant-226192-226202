const mysql = require('mysql2/promise');
const { config } = require('../config/env');

let pool;

/**
 * PUBLIC_INTERFACE
 * Returns a singleton MySQL pool.
 * Throws a descriptive error if required env vars are missing.
 */
function getPool() {
  if (pool) return pool;

  const { mysql: mysqlCfg } = config;
  const missing = [];
  if (!mysqlCfg.user) missing.push('MYSQL_USER');
  if (!mysqlCfg.password) missing.push('MYSQL_PASSWORD');
  if (!mysqlCfg.database) missing.push('MYSQL_DB');
  if (!mysqlCfg.host) missing.push('MYSQL_URL');
  if (!mysqlCfg.port) missing.push('MYSQL_PORT');

  if (missing.length > 0) {
    const err = new Error(
      `Missing MySQL environment variables: ${missing.join(
        ', '
      )}. Please configure accountant_backend to connect to the database container.`
    );
    err.code = 'CONFIG_ERROR';
    throw err;
  }

  pool = mysql.createPool({
    host: mysqlCfg.host,
    user: mysqlCfg.user,
    password: mysqlCfg.password,
    database: mysqlCfg.database,
    port: mysqlCfg.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
    decimalNumbers: true,
  });

  return pool;
}

/**
 * PUBLIC_INTERFACE
 * Executes a parameterized query and returns rows.
 * @param {string} sql SQL statement with ? placeholders
 * @param {any[]} params params array
 */
async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

module.exports = {
  getPool,
  query,
};
