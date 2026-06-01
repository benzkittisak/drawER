# drawDB Live

Real-time collaborative ER database-diagram editor — design tables and relationships with your
team, see each other's cursors live, export to SQL / DBML / JSON. Local-first; works offline and
syncs when you share a room.

> Clean-room, commercial rebuild inspired by drawdb. Built with React 19 + Vite + TypeScript,
> Yjs (CRDT) for real-time sync, and a custom canvas. No AGPL code.

## Quick start
```bash
npm install
npm run dev      # http://localhost:5173
```

## Scripts
| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build |
| `npm test` | Unit + golden-file tests (Vitest) |
| `npm run lint` / `typecheck` / `depcruise` | Quality gates |

## Status
Early foundation (milestone M0): the three views — **Dashboard → Editor → Version history** —
render as an interactive demo on seed data. Real domain model, SQL engine, persistence, and live
collaboration land in M1–M6.

## Documentation
- `CLAUDE.md` — orientation for contributors (incl. AI agents).
- `docs/architecture.md` — how the modules fit together.
- `docs/conventions.md` — coding standards + module boundaries.
- `docs/tasks/` — the work backlog (one ticket per unit of work).
- `docs/json-format.md` + `schemas/saved-diagram.schema.json` — the JSON export format.
- `docs/adr/` — why the big decisions were made.
