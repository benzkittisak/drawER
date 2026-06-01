/**
 * drawER sync + storage server.
 *
 * A Yjs WebSocket server (y-websocket's setupWSConnection) whose documents are persisted to a
 * real **SQLite** database via Node's built-in `node:sqlite` (no native npm deps). Every diagram
 * is a room named `drawer-<id>`; its Yjs document is loaded from / saved to the `docs` table, so
 * diagram data lives server-side and survives across devices. No auth — anyone with the id/link
 * can open a diagram (per product decision).
 *
 * Also exposes `GET /api/diagrams` returning the list of stored diagrams (for the Dashboard).
 *
 * Run:  npm run sync     (ws + http on :1234; override with PORT / DB_PATH)
 * The client points at it via VITE_SYNC_URL (defaults to ws://localhost:1234).
 */
const http = require('node:http');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { WebSocketServer } = require('ws');
const Y = require('yjs');

// y-websocket's server utils aren't exposed via package "exports"; require the file directly.
const { setupWSConnection, setPersistence } = require(
  path.join(__dirname, '..', '..', 'node_modules', 'y-websocket', 'bin', 'utils.cjs'),
);

const PORT = Number(process.env.PORT || 1234);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'drawer.sqlite');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS docs (
    name        TEXT PRIMARY KEY,
    data        BLOB,
    displayName TEXT,
    dialect     TEXT,
    tableCount  INTEGER,
    updatedAt   INTEGER
  )
`);
const loadStmt = db.prepare('SELECT data FROM docs WHERE name = ?');
const upsertStmt = db.prepare(`
  INSERT INTO docs (name, data, displayName, dialect, tableCount, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET
    data = excluded.data, displayName = excluded.displayName,
    dialect = excluded.dialect, tableCount = excluded.tableCount, updatedAt = excluded.updatedAt
`);
const listStmt = db.prepare(
  'SELECT name, displayName, dialect, tableCount, updatedAt FROM docs WHERE tableCount > 0 ORDER BY updatedAt DESC',
);

const timers = new Map();

function persist(docName, ydoc) {
  const update = Y.encodeStateAsUpdate(ydoc);
  const meta = ydoc.getMap('meta');
  const displayName = meta.get('name') || 'Untitled diagram';
  const dialect = meta.get('dialect') || 'postgres';
  const tableCount = ydoc.getMap('tables').size;
  upsertStmt.run(docName, update, displayName, dialect, tableCount, Date.now());
}

function schedulePersist(docName, ydoc) {
  clearTimeout(timers.get(docName));
  timers.set(docName, setTimeout(() => persist(docName, ydoc), 600));
}

setPersistence({
  provider: null,
  bindState: async (docName, ydoc) => {
    const row = loadStmt.get(docName);
    if (row && row.data) Y.applyUpdate(ydoc, new Uint8Array(row.data));
    ydoc.on('update', () => schedulePersist(docName, ydoc));
  },
  writeState: async (docName, ydoc) => {
    persist(docName, ydoc);
  },
});

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && (req.url === '/api/diagrams' || req.url.startsWith('/api/diagrams?'))) {
    const rows = listStmt.all().map((r) => ({
      id: String(r.name).replace(/^drawer-/, ''),
      name: r.displayName,
      dialect: r.dialect,
      tableCount: r.tableCount,
      updatedAt: r.updatedAt,
    }));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(rows));
    return;
  }
  res.statusCode = 404;
  res.end('drawER sync server');
});

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', setupWSConnection);
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

server.listen(PORT, () => {
  console.log(`drawER server running — ws + http://localhost:${PORT}  (db: ${DB_PATH})`);
});
