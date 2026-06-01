'use strict';

const { isEnabled, maxTables, DIALECTS } = require('./config.cjs');
const { normalizeConnection } = require('./connection.cjs');

/** @type {Record<string, string>} */
const ADAPTER_MODULES = {
  postgres: './postgres.cjs',
  mysql: './mysql.cjs',
  mssql: './mssql.cjs',
  sqlite: './sqlite.cjs',
  oracle: './oracle.cjs',
};

/** @type {Record<string, object>} */
const adapterCache = {};

function adapterFor(dialect) {
  const key = dialect === 'mariadb' ? 'mysql' : dialect;
  const modPath = ADAPTER_MODULES[key];
  if (!modPath) throw new Error(`Unsupported dialect: ${dialect}`);
  if (!adapterCache[key]) {
    try {
      adapterCache[key] = require(modPath);
    } catch (err) {
      if (err && typeof err === 'object' && err.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          `Database driver for ${dialect} is not installed (${err.message}). Run bun install.`,
        );
      }
      throw err;
    }
  }
  return adapterCache[key];
}

function disabledResponse(res) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      error: 'Remote database import is disabled. Set ENABLE_REMOTE_DB_IMPORT=1 on the sync server.',
    }),
  );
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function validateDialect(dialect) {
  if (!DIALECTS.includes(dialect)) {
    throw new Error(`dialect must be one of: ${DIALECTS.join(', ')}`);
  }
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
async function handleDbConnect(req, res) {
  if (!isEnabled()) return disabledResponse(res);
  const body = req.body || {};
  const dialect = String(body.dialect || '').toLowerCase();
  validateDialect(dialect);
  if (dialect === 'sqlite') {
    return json(res, 200, await adapterFor('sqlite').connect());
  }
  const cfg = await normalizeConnection(dialect, body.connection);
  const result = await adapterFor(dialect).connect(cfg);
  return json(res, 200, result);
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
async function handleDbIntrospect(req, res) {
  if (!isEnabled()) return disabledResponse(res);
  const body = req.body || {};
  const dialect = String(body.dialect || '').toLowerCase();
  validateDialect(dialect);
  const limit = maxTables();

  if (dialect === 'sqlite') {
    return json(res, 400, { error: 'Use POST /api/db/introspect-sqlite for SQLite file upload.' });
  }

  const database = String(body.database || '').trim();
  if (!database) return json(res, 400, { error: 'database is required' });

  const cfg = await normalizeConnection(dialect, body.connection);
  const schema = body.schema != null ? String(body.schema) : undefined;
  const { neutral, schemas, warnings: extra } = await adapterFor(dialect).introspect(
    cfg,
    database,
    schema,
    limit,
  );
  return json(res, 200, { neutral, schemas, warnings: extra });
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
async function handleDbIntrospectSqlite(req, res) {
  if (!isEnabled()) return disabledResponse(res);
  const body = req.body || {};
  const dataB64 = body.data;
  if (!dataB64 || typeof dataB64 !== 'string') {
    return json(res, 400, { error: 'data (base64 file contents) is required' });
  }
  const buf = Buffer.from(dataB64, 'base64');
  if (buf.length > 50 * 1024 * 1024) {
    return json(res, 400, { error: 'SQLite file too large (max 50MB)' });
  }
  const { neutral } = await adapterFor('sqlite').introspectBuffer(buf, body.filename, maxTables());
  return json(res, 200, { neutral });
}

/**
 * Route /api/db/* if matched.
 * @returns {boolean} true if handled
 */
async function handleDbRoutes(req, res, url, method) {
  if (!url.startsWith('/api/db/')) return false;
  try {
    if (method === 'POST' && url === '/api/db/connect') {
      await handleDbConnect(req, res);
      return true;
    }
    if (method === 'POST' && url === '/api/db/introspect') {
      await handleDbIntrospect(req, res);
      return true;
    }
    if (method === 'POST' && url === '/api/db/introspect-sqlite') {
      await handleDbIntrospectSqlite(req, res);
      return true;
    }
    json(res, 404, { error: 'Not found' });
    return true;
  } catch (err) {
    console.error('DB import error', err);
    json(res, 502, { error: err instanceof Error ? err.message : String(err) });
    return true;
  }
}

module.exports = { handleDbRoutes, isEnabled };
