# ADR 0005 — Remote database schema import (sync proxy)

**Status:** Accepted · **Date:** 2026-06-01

## Context

Users want to connect to a live database server, list databases, pick one, and import its schema into an ER
diagram. Browsers cannot open raw TCP connections to Postgres/MySQL/MSSQL/Oracle, and credentials must not
live in client-side storage. The sync server already proxies AI schema generation (`POST /api/ai/generate-schema`).

The product still has **no authentication** on the sync server (ADR 0004).

## Decision

- **Proxy only:** `POST /api/db/connect` and `POST /api/db/introspect` on the sync server (`server/db-introspect/`).
  Drivers (`pg`, `mysql2`, `mssql`, `better-sqlite3`, optional `oracledb`) stay in `server/`, never in `src/core`.
- **Default off:** `ENABLE_REMOTE_DB_IMPORT=1` required. Credentials are used per request only, never persisted or logged.
- **Response shape:** `NeutralSchema` JSON → client `importFromNeutralSchema()` (no SQL round-trip).
- **SQLite:** upload via `POST /api/db/introspect-sqlite` with base64 file body (no long-lived file on disk).
- **SSRF mitigation:** resolve host from connection; block private/link-local ranges unless
  `DB_IMPORT_ALLOW_PRIVATE_NET=1`. Connection and query timeouts (~15s). Cap tables via `DB_IMPORT_MAX_TABLES`
  (default 500).
- **Read-only:** document that operators should use a read-only DB account; the server only runs metadata queries
  (and `SHOW CREATE TABLE` where applicable).

## Consequences

- Self-hosted deployments can enable import for trusted networks; public deployments must not enable until auth (M7).
- Oracle requires Oracle Instant Client in the server image for full support (see `server/Dockerfile` comments).
- Import is **one-shot** into the Yjs diagram — not live reverse-sync with the database.

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `ENABLE_REMOTE_DB_IMPORT` | off | Must be `1` to expose `/api/db/*` |
| `DB_IMPORT_ALLOW_PRIVATE_NET` | off | Allow 10/8, 172.16/12, 127/8, ::1 targets |
| `DB_IMPORT_MAX_TABLES` | `500` | Max tables per introspect |
| `DB_IMPORT_TIMEOUT_MS` | `15000` | Connection / query timeout |
