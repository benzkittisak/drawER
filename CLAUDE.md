# drawDB Live

A **real-time collaborative ER (entity-relationship) database-diagram editor**. The headline
feature is multiplayer editing with **live teammate cursors** (Figma/Miro style). Clean-room
rebuild of drawdb — see "Locked decisions" below.

> **New here (human or agent)? Read this file, then `docs/architecture.md`, then pick a ticket
> from `docs/tasks/`.** Everything you need to start is in those three places.

## Status
- **M0–M7 implemented.** The app is a working real-time collaborative ER editor:
  - **Core engine** (`src/core`): domain model + type catalogs; SQL export for 6 dialects
    (dialect-strategy, golden-tested); SQL import (node-sql-parser) + DBML import/export +
    Mermaid/Markdown; versioned JSON interchange (schema-validated, lossless round-trip).
  - **Editor**: store-bound canvas (drag, FK-link, add/delete), Export/Import dialogs.
  - **Collaboration** (`src/collab`): Yjs doc + y-indexeddb + y-websocket, **live cursors +
    presence + advisory locks** (Awareness), `Y.UndoManager`, Share/join-by-link, pinned
    comments, activity feed, local version history (snapshots/diffs/restore).
  - **Server database**: `bun run sync` runs a Yjs websocket server that persists every diagram
    to **PostgreSQL** (via `pg`; Docker Compose runs Postgres automatically) and serves
    `GET /api/diagrams`. Clients connect on every open, so data lives server-side and is
    cross-device; IndexedDB is the offline cache. No auth (open by id/link). Dashboard lists from
    the DB (falls back to local when offline).
  - Heavy parsers (node-sql-parser / @dbml/core) are **lazy-loaded** (dynamic import).
- **Remote DB import** (Import → Database): sync server introspects live DBs when
  `ENABLE_REMOTE_DB_IMPORT=1` (see `docs/adr/0005-remote-db-import.md`).
  - `typecheck` / `lint` / `depcruise` / `test` (38) / `build` all green.
- **Deferred (M7 / future):** accounts + server-persisted team workspace, roles/permissions,
  cross-diagram presence; self-hosted fonts (currently Google Fonts @import); i18n.
- Verify live collaboration: `bun run sync`, then open the same diagram in two windows and Share.

## Locked decisions (do not re-litigate — see `docs/adr/`)
1. **From scratch**, including our own SQL engine.
2. **Closed-source / commercial** → **never read or copy drawdb's AGPL-3.0 source**; every
   dependency must be permissive (MIT / Apache-2.0 / BSD / ISC).
3. **Real-time sync = Yjs (self-hosted)** + Awareness for cursors/presence.
4. **Local-first** (IndexedDB) with **optional** room sync. No mandatory backend / accounts yet.

## Commands
Package manager is **Bun** (lockfile `bun.lock`). The sync server runs on **Node** + **PostgreSQL**.
```bash
bun install         # install dependencies
bun run dev         # Vite dev server (http://localhost:5173)
bun run build       # tsc -b && vite build
bun run test        # Vitest (unit + golden-file SQL tests)  — NOT `bun test` (that's Bun's runner)
bun run typecheck   # tsc --noEmit
bun run lint        # ESLint
bun run depcruise   # module import-boundary check (must pass)
bun run format      # Prettier
bun run sync        # Yjs websocket server + Postgres (ws+http on :1234) — diagram storage
```
Before committing, the change must pass: `bun run typecheck`, `bun run lint`, `bun run depcruise`, `bun run test`, `bun run build`.

## Module map (src/)
| Module | Role | May import |
|---|---|---|
| `core/` | **Pure TS** domain model + SQL engine. No React/DOM/Yjs. Unit-testable in Node. | nothing app-side |
| `collab/` | Yjs document, awareness, providers, undo. **The only place Yjs lives.** | `core` |
| `store/` | zustand read-model + typed hooks bridging `collab` → React. | `core`, `collab` |
| `canvas/` | The interactive diagram surface (DOM + SVG). | `core`, `store`, `ui` |
| `views/` | Dashboard / Editor / History + panels. | `core`, `store`, `canvas`, `ui` |
| `ui/` | Design-system atoms (Avatar, Btn, Modal, Pop, Icon). | — |
| `data/` | Seed/demo data (temporary; removed as real state lands). | `core` types later |

Boundaries are **enforced** by `.dependency-cruiser.cjs` (fails CI). Full rules + style in
`docs/conventions.md`. Path aliases: `@core/* @collab/* @store/* @canvas/* @views/* @ui/* @data/*`.

## Key references
- **Design (pixel target):** `docs/design-reference/` — the original prototype (`styles.css`,
  `*.jsx`, and `_check/*.png` screenshots). We port its **look**, not its internal structure.
  `styles.css` is adopted verbatim as `src/styles/styles.css`.
- **The plan:** the approved build plan lives at `~/.claude/plans/repo-fizzy-balloon.md`
  (architecture, milestones M0–M7, verification).
- **Data interchange:** `docs/json-format.md` + `schemas/saved-diagram.schema.json`.
