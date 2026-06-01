# drawDB Live — Agent guide

Real-time collaborative ER diagram editor (live teammate cursors). Clean-room rebuild of drawdb — **never read or copy drawdb's AGPL-3.0 source**.

## Start here

1. Read this file.
2. Read `docs/architecture.md` (data flow, Yjs model, current M0 vs target).
3. Pick work from `docs/tasks/` (current milestone: **M1** — domain model + canvas store).

Deeper references: `docs/conventions.md`, `docs/adr/`, `docs/json-format.md`, `schemas/saved-diagram.schema.json`.

## Status

- **M0 done:** Vite + React 19 + TS, design system, Dashboard → Editor → History on seed data (non-collaborative demo). `typecheck`, `lint`, `depcruise`, `test`, `build` are green.
- **Next:** M1 — see `docs/tasks/`.

## Locked decisions (do not re-litigate)

See `docs/adr/` for rationale.

1. **From scratch**, including our own SQL engine (`src/core`).
2. **Closed-source / commercial** — permissive deps only (MIT / Apache-2.0 / BSD / ISC). No AGPL drawdb code.
3. **Real-time sync:** Yjs (self-hosted) + Awareness for cursors/presence. Yjs **only** in `src/collab/`.
4. **Local-first** (IndexedDB), optional room sync. No mandatory backend/accounts yet.

## Commands

```bash
npm run dev         # http://localhost:5173
npm run build       # tsc -b && vite build
npm test            # Vitest (unit + golden-file SQL tests)
npm run typecheck
npm run lint
npm run depcruise   # import boundaries — must pass
npm run format
```

**Before finishing a change:** run `typecheck`, `lint`, `depcruise`, `test`, `build` (same bar as `CLAUDE.md`).

## Module boundaries (`src/`)

Import rules are enforced by `.dependency-cruiser.cjs`. Path aliases: `@core/*`, `@collab/*`, `@store/*`, `@canvas/*`, `@views/*`, `@ui/*`, `@data/*`.

| Module    | Role | May import |
|-----------|------|------------|
| `core/`   | Pure TS domain + SQL engine. No React/DOM/Yjs. | (nothing app-side) |
| `collab/` | Yjs doc, awareness, providers, undo. **Only place for `yjs`.** | `core` |
| `store/`  | Zustand read-model + hooks: collab → React. | `core`, `collab` |
| `canvas/` | Diagram surface (DOM + SVG). | `core`, `store`, `ui` |
| `views/`  | Dashboard / Editor / History + panels. | `core`, `store`, `canvas`, `ui` |
| `ui/`     | Design-system atoms. | — |
| `data/`   | Seed/demo (temporary). | `core` types later |

**Data flow (target):** UI → store action → Yjs transaction → observer → store → UI. Do not write Yjs inside observers.

Style and naming: `docs/conventions.md`.

## Agent workflow

- **Scope:** Implement the ticket in `docs/tasks/`; avoid unrelated refactors.
- **Design:** Match `docs/design-reference/` (look only — port visuals, not prototype structure). `styles.css` lives at `src/styles/styles.css`.
- **M0 reality:** Views still use `src/data` seed + local React state; real Yjs/store lands in later milestones — don't assume collab APIs exist until the task says so.
- **Dependencies:** New packages must be permissively licensed; run `depcruise` after import changes.
- **Commits:** Only when the user asks; never commit secrets.

## Key files

| Topic | Location |
|-------|----------|
| Architecture & Yjs | `docs/architecture.md` |
| Tasks / milestones | `docs/tasks/` |
| ADRs | `docs/adr/` |
| Saved diagram JSON | `docs/json-format.md`, `schemas/saved-diagram.schema.json` |
| Human-oriented summary | `CLAUDE.md` (keep in sync with this file for commands/status/boundaries) |
