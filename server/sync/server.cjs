/**
 * Optional Yjs sync server for drawDB Live — thin launcher around the bundled y-websocket
 * reference server (MIT). Run with:  npm run sync   (listens on ws://localhost:1234).
 *
 * Override host/port with HOST / PORT env vars. Point the client at it with VITE_SYNC_URL.
 * This is the dev/self-host option; for production swap in Hocuspocus (MIT core) or a
 * Cloudflare Durable Object behind the same WebSocket URL — the client (collab/session.ts)
 * only knows the URL, so the backend is swappable.
 */
// Require by absolute path — y-websocket's package "exports" doesn't expose the bin subpath,
// but requiring the file directly bypasses exports resolution.
const path = require('path');
require(path.join(__dirname, '..', '..', 'node_modules', 'y-websocket', 'bin', 'server.cjs'));
