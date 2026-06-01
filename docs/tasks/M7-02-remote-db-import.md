# M7-02 — Remote database schema import
Status: done
Milestone: M7
Depends on: M3-01, sync server (ADR 0004)

## Goal
Import an ER diagram from a live database: connection URL → list databases → pick one → introspect
metadata into the diagram (one-shot, not live sync).

## Implementation
- ADR [0005-remote-db-import.md](../adr/0005-remote-db-import.md)
- `server/db-introspect/` — dialect adapters + `/api/db/connect`, `/api/db/introspect`, `/api/db/introspect-sqlite`
- `importFromNeutralSchema` in `@core`
- Import modal **Database** tab — [DatabaseImportPanel.tsx](../../src/views/panels/DatabaseImportPanel.tsx)

## How to verify
1. `ENABLE_REMOTE_DB_IMPORT=1` and `DB_IMPORT_ALLOW_PRIVATE_NET=1` on sync (enabled in docker-compose.dev.yml).
2. `bun run sync` and `bun run dev`.
3. Editor → Import → Database → `postgres://drawer:drawer@localhost:5433/` → Connect → select `drawer` → Import.
