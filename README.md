# drawDB Live

Real-time collaborative ER database-diagram editor — design tables and relationships with your
team, see each other's cursors live, export to SQL / DBML / JSON. Local-first; works offline and
syncs when you share a room.

> Clean-room, commercial rebuild inspired by drawdb. Built with React 19 + Vite + TypeScript,
> Yjs (CRDT) for real-time sync, and a custom canvas. No AGPL code.

## Run with Docker — development (hot reload)
```bash
docker compose -f docker-compose.dev.yml up --build   # open http://localhost:5173
```
- **web** — Vite dev server with HMR (`:5173`); edits to `src/` reload instantly.
- **sync** — Yjs server + SQLite, auto-restarted by nodemon on changes (`:1234`).
- Source is bind-mounted; `node_modules` stays in the container. File watching uses polling so
  HMR works through Docker bind mounts on Windows/WSL.

## Run with Docker — production (full stack)
```bash
docker compose up --build      # web on http://localhost:9901, sync+DB on :1234
```
- **web** — the built SPA served by nginx (`:9901`).
- **sync** — Yjs websocket server + SQLite database, stored on a persistent volume (`drawer-data`).

Open http://localhost:9901 in two browsers, create/open a diagram, then **copy the URL**
(`…?room=<id>`) into the other browser to collaborate live (cursors + presence). The TopBar shows
**Live · synced** when connected. To deploy elsewhere, rebuild web with
`--build-arg VITE_SYNC_URL=wss://your-host` and publish the sync server there.

## Run locally (dev)
Uses **Bun** as the package manager (the sync server runs on Node for `node:sqlite`).
```bash
bun install
bun run sync     # Yjs server + SQLite database (ws+http on :1234)
bun run dev      # http://localhost:5173
```

## Scripts
| Command | What |
|---|---|
| `bun install` | Install dependencies (lockfile: `bun.lock`) |
| `bun run dev` | Vite dev server |
| `bun run sync` | Yjs sync server + SQLite database (diagram storage) |
| `bun run build` | Type-check + production build |
| `bun test`* / `bun run test` | Unit + golden-file tests (Vitest) |
| `bun run lint` / `typecheck` / `depcruise` | Quality gates |

\* use `bun run test` (runs Vitest); `bun test` would invoke Bun's own runner.

## Status
Real-time collaborative ER editor: domain model + SQL engine (6 dialects) + import/DBML/Mermaid/
Markdown + versioned JSON; Yjs live collaboration (cursors, presence, comments, activity, version
history); diagrams persisted in a server-side SQLite database (no auth). See `CLAUDE.md`.

## Documentation
- `CLAUDE.md` — orientation for contributors (incl. AI agents).
- `docs/architecture.md` — how the modules fit together.
- `docs/conventions.md` — coding standards + module boundaries.
- `docs/tasks/` — the work backlog (one ticket per unit of work).
- `docs/json-format.md` + `schemas/saved-diagram.schema.json` — the JSON export format.
- `docs/adr/` — why the big decisions were made.
