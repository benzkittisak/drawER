# ADR 0004 — Server-side PostgreSQL storage (no auth), always-connected

**Status:** Accepted · **Date:** 2026-06-01 · **Amended:** 2026-06-01 (SQLite → PostgreSQL)

## Context
The product owner wanted diagram data stored in a real database and real (not mock) collaborators,
but explicitly **no authentication**. The app already syncs via Yjs over `y-websocket`.
Docker Compose runs the full stack, so PostgreSQL is the natural durable store.

## Decision
- **Storage:** the sync server persists every diagram's Yjs document to **PostgreSQL** (`pg` pool,
  `BYTEA` column for Yjs state). It also serves `GET /api/diagrams` and `DELETE /api/diagrams/:id`
  for the Dashboard.
- **Docker:** `docker-compose.yml` / `docker-compose.dev.yml` include a `postgres:16-alpine`
  service; `sync` uses `DATABASE_URL=postgres://drawer:drawer@db:5432/drawer`.
- **Local `bun run sync`:** defaults to the same URL on `localhost:5432` (start Postgres via
  Compose or a local install).
- **Server impl:** y-websocket's `setupWSConnection` + `setPersistence` (unchanged wire protocol).
- **Client:** connect on every diagram open; IndexedDB remains the offline cache. No auth.

## Consequences
- Data is durable server-side and cross-device; the Dashboard reflects the DB.
- Production: use a managed Postgres or the Compose volume `drawer-pg`.
- The backend remains swappable behind `VITE_SYNC_URL` (+ derived REST base).
