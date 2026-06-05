/**
 * drawER sync + storage server.
 *
 * Yjs WebSocket server (y-websocket's setupWSConnection) with PostgreSQL persistence.
 * Every diagram is a room named `drawer-<id>`; its Yjs document is loaded from / saved to
 * the `docs` table. Also exposes `GET /api/diagrams` and `DELETE /api/diagrams/:id`.
 *
 * Run:  bun run sync     (ws + http on :1234)
 * Env:  PORT, DATABASE_URL (default postgres://drawer:drawer@localhost:5432/drawer)
 *        OPENAI_API_KEY (optional — enables POST /api/ai/generate-schema)
 *        OPENAI_MODEL (default gpt-4o-mini), OPENAI_BASE_URL (default https://api.openai.com/v1)
 *        ENABLE_REMOTE_DB_IMPORT=1 (optional — POST /api/db/connect, /api/db/introspect)
 *        DB_IMPORT_ALLOW_PRIVATE_NET=1 (dev: allow localhost/private IPs)
 */
const http = require('node:http');
const path = require('node:path');
const { Pool } = require('pg');
const { WebSocketServer } = require('ws');
const Y = require('yjs');

const { setupWSConnection, setPersistence, docs } = require(
  path.join(__dirname, '..', '..', 'node_modules', 'y-websocket', 'bin', 'utils.cjs'),
);
const dbIntrospectPath = path.join(__dirname, '..', 'db-introspect', 'index.cjs');
/** @type {typeof import('../db-introspect/index.cjs').handleDbRoutes | null} */
let handleDbRoutes = null;
function getHandleDbRoutes() {
  if (!handleDbRoutes) {
    ({ handleDbRoutes } = require(dbIntrospectPath));
  }
  return handleDbRoutes;
}

const PORT = Number(process.env.PORT || 1234);
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://drawer:drawer@localhost:5432/drawer';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

// Bound the pool so a burst of clients can't exhaust Postgres connections, and reclaim idle ones.
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
const timers = new Map();
// Doc names deleted via the REST API. While a deleted room's doc is still alive in memory
// (clients connected), its update/close persists would silently re-INSERT the row — the
// "deleted diagram reappears" bug. Tombstoned names skip persistence until the diagram is
// explicitly recreated (new ws open of the room, or a REST PUT).
const deletedDocs = new Set();

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS docs (
      name        TEXT PRIMARY KEY,
      data        BYTEA,
      display_name TEXT,
      dialect     TEXT,
      table_count INTEGER,
      updated_at  BIGINT
    )
  `);
  // GET /api/diagrams orders by updated_at DESC — index it so the dashboard list stays fast as the
  // library grows (avoids a full scan + sort).
  await pool.query('CREATE INDEX IF NOT EXISTS idx_docs_updated_at ON docs (updated_at DESC)');
}

async function loadDoc(name) {
  const res = await pool.query('SELECT data FROM docs WHERE name = $1', [name]);
  return res.rows[0] ?? null;
}

async function persist(docName, ydoc) {
  if (deletedDocs.has(docName)) return;
  const update = Y.encodeStateAsUpdate(ydoc);
  const meta = ydoc.getMap('meta');
  const displayName = meta.get('name') || 'Untitled diagram';
  const dialect = meta.get('dialect') || 'postgres';
  const tableCount = ydoc.getMap('tables').size;
  await pool.query(
    `INSERT INTO docs (name, data, display_name, dialect, table_count, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO UPDATE SET
       data = EXCLUDED.data,
       display_name = EXCLUDED.display_name,
       dialect = EXCLUDED.dialect,
       table_count = EXCLUDED.table_count,
       updated_at = EXCLUDED.updated_at`,
    [docName, Buffer.from(update), displayName, dialect, tableCount, Date.now()],
  );
}

function schedulePersist(docName, ydoc) {
  clearTimeout(timers.get(docName));
  timers.set(
    docName,
    setTimeout(() => {
      persist(docName, ydoc).catch((err) => console.error('persist failed', docName, err));
    }, 600),
  );
}

setPersistence({
  provider: null,
  bindState: async (docName, ydoc) => {
    // A fresh open of a previously deleted room is a legitimate re-creation.
    deletedDocs.delete(docName);
    const row = await loadDoc(docName);
    if (row?.data) Y.applyUpdate(ydoc, new Uint8Array(row.data));
    ydoc.on('update', () => schedulePersist(docName, ydoc));
    schedulePersist(docName, ydoc);
  },
  writeState: async (docName, ydoc) => {
    await persist(docName, ydoc);
  },
});

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function stripSqlFences(text) {
  return String(text)
    .replace(/^```(?:sql)?\s*\r?\n?/i, '')
    .replace(/\r?\n?```\s*$/i, '')
    .trim();
}

/** @returns {Promise<string>} */
async function generateSchemaSql(prompt, dialect) {
  const system = [
    `You are a database schema assistant.`,
    `Output ONLY valid ${dialect} SQL DDL: CREATE TABLE statements and ALTER TABLE ... ADD CONSTRAINT for foreign keys.`,
    `No markdown fences, no explanations, no prose before or after the SQL.`,
  ].join(' ');
  // Abort if the upstream stalls — otherwise a slow/unreachable OpenAI hangs the HTTP request open.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `OpenAI request failed (${res.status})`;
      throw new Error(msg);
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('OpenAI returned no SQL content');
    }
    return stripSqlFences(content);
  } finally {
    clearTimeout(timeout);
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    const url = req.url?.split('?')[0] ?? '';
    // Cheap liveness probe for container healthchecks — no DB round-trip.
    if (req.method === 'GET' && url === '/healthz') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('ok');
      return;
    }
    if (req.method === 'POST' && url.startsWith('/api/db/')) {
      const body = await readJsonBody(req);
      req.body = body;
      if (await getHandleDbRoutes()(req, res, url, req.method)) return;
    }
    if (req.method === 'POST' && req.url === '/api/ai/generate-schema') {
      if (!OPENAI_API_KEY) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'AI not configured. Set OPENAI_API_KEY on the sync server.' }));
        return;
      }
      const body = await readJsonBody(req);
      const prompt = String(body.prompt || '').trim();
      const dialect = String(body.dialect || 'postgres');
      if (!prompt) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'prompt is required' }));
        return;
      }
      try {
        const sql = await generateSchemaSql(prompt, dialect);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ sql }));
      } catch (err) {
        console.error('AI generate-schema failed', err);
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }
    if (req.method === 'GET' && (req.url === '/api/diagrams' || req.url.startsWith('/api/diagrams?'))) {
      const result = await pool.query(
        `SELECT name, display_name, dialect, table_count, updated_at
         FROM docs ORDER BY updated_at DESC`,
      );
      const rows = result.rows.map((r) => ({
        id: String(r.name).replace(/^drawer-/, ''),
        name: r.display_name,
        dialect: r.dialect,
        tableCount: r.table_count,
        updatedAt: Number(r.updated_at),
      }));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(rows));
      return;
    }
    const idMatch = req.url?.match(/^\/api\/diagrams\/([^/?]+)$/);
    // The client sends encodeURIComponent(id); decode so the stored name matches the room name.
    const diagramId = idMatch ? decodeURIComponent(idMatch[1]) : null;
    if (req.method === 'PUT' && idMatch) {
      const body = await readJsonBody(req);
      const docName = `drawer-${diagramId}`;
      deletedDocs.delete(docName); // explicit upload = re-creation

      const displayName = body.name || 'Untitled diagram';
      const dialect = body.dialect || 'postgres';
      const tableCount = Number.isFinite(body.tableCount) ? body.tableCount : 0;
      const updatedAt = Number.isFinite(body.updatedAt) ? body.updatedAt : Date.now();
      const data = body.state ? Buffer.from(body.state, 'base64') : null;
      if (data) {
        await pool.query(
          `INSERT INTO docs (name, data, display_name, dialect, table_count, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (name) DO UPDATE SET
             data = EXCLUDED.data,
             display_name = EXCLUDED.display_name,
             dialect = EXCLUDED.dialect,
             table_count = EXCLUDED.table_count,
             updated_at = EXCLUDED.updated_at`,
          [docName, data, displayName, dialect, tableCount, updatedAt],
        );
      } else {
        await pool.query(
          `INSERT INTO docs (name, data, display_name, dialect, table_count, updated_at)
           VALUES ($1, NULL, $2, $3, $4, $5)
           ON CONFLICT (name) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             dialect = EXCLUDED.dialect,
             table_count = EXCLUDED.table_count,
             updated_at = EXCLUDED.updated_at`,
          [docName, displayName, dialect, tableCount, updatedAt],
        );
      }
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method === 'DELETE' && idMatch) {
      const docName = `drawer-${diagramId}`;
      // Kill the in-memory room BEFORE deleting the row, or its pending debounce / on-close
      // writeState would re-INSERT the diagram moments later (it "came back" after deletion).
      deletedDocs.add(docName);
      clearTimeout(timers.get(docName));
      timers.delete(docName);
      const doc = docs.get(docName);
      if (doc) {
        // Closing every conn lets y-websocket run its normal teardown (writeState is a no-op
        // thanks to the tombstone, then the doc is destroyed and unregistered).
        for (const conn of doc.conns.keys()) conn.close();
        docs.delete(docName);
      }
      await pool.query('DELETE FROM docs WHERE name = $1', [docName]);
      res.statusCode = 204;
      res.end();
      return;
    }
  } catch (err) {
    console.error('HTTP error', err);
    res.statusCode = 500;
    res.end('Internal error');
    return;
  }
  res.statusCode = 404;
  res.end('drawER sync server');
});

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws, req) => {
  // Derive the Yjs doc/room name ourselves and strip any leading slashes a reverse proxy may have
  // left on the path (e.g. an nginx prefix rewrite can yield //room → req.url "//room"). The
  // default docName is `req.url.slice(1)`, which keeps a stray leading slash and would persist the
  // doc under "/drawer-<id>" — defeating the GET/DELETE `drawer-` prefix round-trip. Normalizing
  // here makes storage immune to proxy path quirks regardless of the nginx config.
  const docName = (req.url || '').replace(/^\/+/, '').split('?')[0];
  setupWSConnection(ws, req, { docName });
});
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

async function main() {
  await initDb();
  server.listen(PORT, () => {
    const safeUrl = DATABASE_URL.replace(/:[^:@/]+@/, ':****@');
    console.log(`drawER server running — ws + http://localhost:${PORT}  (db: ${safeUrl})`);
  });
}

main().catch((err) => {
  console.error('Failed to start drawER server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  void pool.end().finally(() => process.exit(0));
});
