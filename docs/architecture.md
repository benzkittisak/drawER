# Architecture

## One-paragraph overview
drawDB Live edits an ER diagram (tables, fields, relationships, notes, areas, types, enums). The
**single source of truth at runtime is a Yjs document** (one `Y.Doc` per diagram). `src/collab`
owns that document and the Awareness channel (presence/cursors). `src/store` observes the doc and
publishes a plain, derived read-model through React hooks. `src/canvas` and `src/views` render
from those hooks and write back through store actions that run Yjs transactions. `src/core` is a
separate, pure library that turns the diagram model into SQL/DBML/JSON and back — it never touches
React, the DOM, or Yjs, so it is unit-testable on its own.

## Data flow (the important part)
```
            ┌─────────────── src/core (pure) ───────────────┐
            │ model types · SQL export/import · DBML · JSON  │
            └───────────────▲───────────────────────────────┘
                            │ mirrors the same Diagram shape
   pointer/keyboard         │
   events                   │
       │            ┌───────┴────────┐     observeDeep     ┌──────────────┐
 canvas/views ─────►│  store actions │────► Yjs Y.Doc ────►│  store (zustand) read-model
 (UI, @store hooks) │ transact(LOCAL)│      (src/collab)   └──────┬───────┘
       ▲            └────────────────┘            │               │ selectors
       │                                          │ awareness     ▼
       └──────────── derived nodes/edges ─────────┴──────────  hooks: useTables, useOthers, …
```
**One-way per phase:** UI events → store action → Yjs transaction; Yjs change → observer → store →
UI. Never write Yjs inside an observer (that creates feedback loops).

## Modules
- **`core/`** — `model/` (canonical `Diagram` types + factories + catalogs), `sql/` (dialect-strategy
  export + parser-based import via a neutral AST), `dbml/`, `mermaid/`, `markdown/`, `layout/`
  (dagre auto-layout for imports), `serialize/` (JSON `SavedDiagram` + migrations). Pure & tested.
- **`collab/`** — `ydoc` (doc + top-level maps), `schema` (Y.Map ⇄ model helpers), `persistence`
  (y-indexeddb), `sync` (websocket provider, shareRoom/leaveRoom), `awareness` (cursor/presence,
  throttle + rAF interpolation), `undo` (Y.UndoManager scoped to local origin), `comments`,
  `activity`, `versions`. The only module importing `yjs`.
- **`store/`** — a zustand store holding the derived read-model + typed hooks
  (`useTables`, `useRelationships`, `useSelection`, `useOthers`, `useUndoRedo`, `useConnection`, …)
  and write actions (`addTable`, `updateField`, `commitDrag`, …). UI's only window into state.
- **`canvas/`** — `Canvas` (camera/pan/zoom/drag/linking), `TableNode`, `RelationshipLayer`,
  `CursorsLayer`, `CommentPins`, `geometry`. DOM + SVG, no React Flow (see ADR 0002).
- **`views/`** — `Dashboard`, `Editor`, `History` + `panels/`.
- **`ui/`** — `Avatar`, `Btn`, `Modal`, `Pop`, `Icon`.

## Collaboration model (how the design's features map to Yjs)
| Feature | Mechanism |
|---|---|
| Live cursors | Awareness: broadcast cursor in **canvas coords** (throttled), render to local screen via the viewport transform, interpolate with a shared rAF loop. |
| Presence avatars / People | Derived from `awareness.getStates()`. |
| Table locks | **Advisory**, derived from awareness `activity:{editing,tableId}` — ephemeral, auto-clears on disconnect. Not a hard mutex. |
| Comments | `comments` Y.Map (synced + persisted). |
| Activity feed | append-only `Y.Array('activity')`. |
| Version history | local snapshots (`Y.encodeStateAsUpdate`) + computed diffs (M6). |
| Share | join a Yjs room (`WebsocketProvider`) on the same local doc. |

## Current state vs target
Today (M0) the views run on `src/data` seed data with **local React state** and a *faked* cursor
animation, so the UI is real and clickable before the backend exists. M1 introduces `core/model`
and a store; M5 swaps local state for the Yjs-backed store and replaces the cursor animation with
Awareness. The component tree and styling do not change when that swap happens — only the data source.
