# ADR 0004 — Server-side SQLite storage (no auth), always-connected

**Status:** Accepted · **Date:** 2026-06-01 · Supersedes the "local-first only" stance of the plan.

## Context
The product owner wanted diagram data stored in a real database and real (not mock) collaborators,
but explicitly **no authentication**. The app already syncs via Yjs over `y-websocket`.

## Decision
- **Storage:** the sync server persists every diagram's Yjs document to a real **SQLite** database
  using Node's built-in **`node:sqlite`** (`DatabaseSync`) — zero native npm dependencies. It also
  serves `GET /api/diagrams` (id, name, dialect, tableCount, updatedAt) for the Dashboard.
- **Server impl:** reuse **y-websocket's `setupWSConnection` + `setPersistence`** (require the
  bundled `bin/utils.cjs` by absolute path) rather than Hocuspocus. Rationale: Hocuspocus speaks a
  different wire protocol and would force swapping the client provider; y-websocket utils let us
  add DB persistence while the existing `WebsocketProvider` client stays unchanged. `bindState`
  loads from SQLite + subscribes to persist (debounced); `writeState` flushes on unload.
- **Client:** connect to the server on **every diagram open** (not only on Share). IndexedDB
  remains the offline cache. We `waitForSync` (≤1.2s, offline-tolerant) before seeding from the
  passed diagram, so opening an existing diagram on a new device doesn't clobber the stored copy.
- **No auth:** any diagram is reachable by id/link; the workspace is effectively shared. Accounts
  + per-user/team authorization remain a future option (would layer on top, e.g. swap the server
  for Hocuspocus + auth hooks behind the same URL).

## Consequences
- Data is durable server-side and cross-device; teammates who open the same diagram collaborate
  live. The Dashboard reflects the DB (falls back to localStorage offline).
- The backend is swappable behind `VITE_SYNC_URL` (+ derived REST base). For production, run the
  server on a host with a persistent volume for the SQLite file (or migrate to Postgres later).
- `node:sqlite` is experimental in Node (prints a warning) but stable enough for this use; revisit
  if pinning to an LTS without it.
