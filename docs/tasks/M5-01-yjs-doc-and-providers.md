# M5-01 — Yjs document + providers + sync server
Status: todo
Milestone: M5
Depends on: M1-02

## Goal
Make the Yjs document the runtime source of truth: model the `Diagram` as Yjs shared types,
persist locally with `y-indexeddb`, and sync optionally over a self-hosted websocket server.
Reimplement the M1-02 store over Yjs **without changing hook signatures**.

## Context / links
- Plan: "Collaboration — Yjs doc" + ADR 0001. `src/collab` is the only module importing `yjs`.
- Schema: per-entity `Y.Map`; fields as `Y.Array<Y.Map>` ordered by fractional-index `sortKey`;
  `Y.Text` only for long text; UUID keys. Transactions use a stable `LOCAL_ORIGIN`.

## Files to touch
- `src/collab/ydoc.ts` (doc + top-level maps + `LOCAL_ORIGIN`), `schema.ts` (Y ⇄ model), 
  `persistence.ts` (y-indexeddb, await `synced`), `sync.ts` (WebsocketProvider, `shareRoom/leaveRoom`),
  `observers.ts` (observeDeep → coalesced push into store), `undo.ts` (`Y.UndoManager` on local origin).
- `src/store/*` — back the store with `@collab` (selectors read derived model; actions run `transact`).
- `server/sync/` — `y-websocket` reference server (MIT) for dev; document run command in CLAUDE.md.
- `.env`: `VITE_SYNC_URL`.

## Public contract
```ts
// @store hooks unchanged from M1-02; add:
export function useConnection(): { status: 'local'|'connecting'|'connected'; isShared: boolean; shareRoom(): string; leaveRoom(): void };
```

## Acceptance criteria
- Editing goes through Yjs transactions; reload restores from IndexedDB.
- Two browser windows on the same `?room=<id>` converge under concurrent edits (CRDT merge).
- Drag writes the doc **once** on mouse-up (live drag is local/awareness only — see M5-02).
- UI still imports no `yjs` (depcruise green).

## How to verify
Run `server/sync`; `bun run dev`; open two windows with the same room; edit concurrently; reload; go offline→online.
