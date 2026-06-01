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
  - **Local-first**: IndexedDB + a Dashboard library; works offline, syncs when shared.
  - Heavy parsers (node-sql-parser / @dbml/core) are **lazy-loaded** (dynamic import).
  - `typecheck` / `lint` / `depcruise` / `test` (38) / `build` all green.
- **Deferred (M7 / future):** accounts + server-persisted team workspace, roles/permissions,
  cross-diagram presence; self-hosted fonts (currently Google Fonts @import); i18n.
- Verify live collaboration: `npm run sync`, then open the same diagram in two windows and Share.

## Locked decisions (do not re-litigate — see `docs/adr/`)
1. **From scratch**, including our own SQL engine.
2. **Closed-source / commercial** → **never read or copy drawdb's AGPL-3.0 source**; every
   dependency must be permissive (MIT / Apache-2.0 / BSD / ISC).
3. **Real-time sync = Yjs (self-hosted)** + Awareness for cursors/presence.
4. **Local-first** (IndexedDB) with **optional** room sync. No mandatory backend / accounts yet.

## Commands
```bash
npm run dev         # Vite dev server (http://localhost:5173)
npm run build       # tsc -b && vite build
npm test            # Vitest (unit + golden-file SQL tests)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run depcruise   # module import-boundary check (must pass)
npm run format      # Prettier
npm run sync        # optional Yjs websocket server (ws://localhost:1234) for live collaboration
```
Before committing, the change must pass: `typecheck`, `lint`, `depcruise`, `test`, `build`.

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
