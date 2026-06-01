'use strict';

const { assertHostAllowed } = require('./security.cjs');

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
  mariadb: 3306,
  mssql: 1433,
  oracle: 1521,
  sqlite: 0,
};

/**
 * @typedef {object} NormalizedConnection
 * @property {string} host
 * @property {number} port
 * @property {string} [user]
 * @property {string} [password]
 * @property {string} [database]
 * @property {boolean} [ssl]
 * @property {string} [connectString] oracle
 * @property {string} [filename] sqlite file path on server (internal)
 */

/**
 * @param {string} dialect
 * @param {string | Record<string, unknown>} connection
 * @returns {Promise<NormalizedConnection>}
 */
async function normalizeConnection(dialect, connection) {
  if (dialect === 'sqlite') {
    if (typeof connection === 'object' && connection?.filename) {
      return { host: 'local', port: 0, filename: String(connection.filename) };
    }
    throw new Error('SQLite requires a file upload (use introspect-sqlite).');
  }

  let cfg;
  if (typeof connection === 'string') {
    cfg = parseConnectionUrl(dialect, connection.trim());
  } else if (connection && typeof connection === 'object') {
    cfg = {
      host: String(connection.host || 'localhost'),
      port: Number(connection.port || DEFAULT_PORTS[dialect] || 5432),
      user: connection.user != null ? String(connection.user) : undefined,
      password: connection.password != null ? String(connection.password) : undefined,
      database: connection.database != null ? String(connection.database) : undefined,
      ssl: Boolean(connection.ssl),
      connectString: connection.connectString != null ? String(connection.connectString) : undefined,
    };
  } else {
    throw new Error('connection must be a URL string or { host, port, user, password, ... }');
  }

  if (!cfg.host) throw new Error('host is required');
  await assertHostAllowed(cfg.host);
  return cfg;
}

/**
 * @param {string} dialect
 * @param {string} raw
 */
function parseConnectionUrl(dialect, raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid connection URL');
  }

  const scheme = url.protocol.replace(/:$/, '').toLowerCase();
  const schemeMap = {
    postgres: 'postgres',
    postgresql: 'postgres',
    mysql: 'mysql',
    mariadb: 'mariadb',
    mssql: 'mssql',
    sqlserver: 'mssql',
    oracle: 'oracle',
  };
  const mapped = schemeMap[scheme];
  if (mapped && mapped !== dialect && !(dialect === 'mariadb' && mapped === 'mysql')) {
    throw new Error(`URL scheme ${scheme} does not match dialect ${dialect}`);
  }

  const host = url.hostname || 'localhost';
  const port = url.port ? Number(url.port) : DEFAULT_PORTS[dialect];
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname ? url.pathname.replace(/^\//, '') : undefined;

  if (dialect === 'oracle') {
    const connectString =
      url.searchParams.get('connectString') ||
      (host && port ? `${host}:${port}/${database || ''}` : database);
    return {
      host,
      port,
      user: user || undefined,
      password: password || undefined,
      database,
      connectString: connectString || undefined,
    };
  }

  return {
    host,
    port,
    user: user || undefined,
    password: password || undefined,
    database: database || undefined,
    ssl: url.searchParams.get('sslmode') === 'require' || url.searchParams.get('ssl') === 'true',
  };
}

module.exports = { normalizeConnection, DEFAULT_PORTS };
