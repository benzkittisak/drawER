# M5-02 — Live cursors + presence via Awareness (the headline)
Status: todo
Milestone: M5
Depends on: M5-01

## Goal
Replace the faked cursor animation with **real** teammate cursors, presence avatars, and advisory
table locks driven by the Yjs Awareness protocol.

## Context / links
- Plan: "Cursor presence / awareness". Current fake: `src/canvas/CursorsLayer.tsx` (lissajous) — its
  markup/props stay; only the position source changes. Presence UI: `TopBar`, `RightPanel` People tab.
- Coordinates: broadcast cursor in **canvas coords**; render each peer by transforming to the local
  screen via the current camera, so positions are correct under different zoom/pan per viewer.

## Files to touch
- `src/collab/awareness.ts` — `PresenceState { user:{id,name,color}, cursor:{x,y}|null, selection:string[],
  viewport?, activity }`; setters; **throttle** pointer broadcast (~30–60fps, trailing); a **single shared
  rAF** loop interpolating all peers (`current += (target-current)*0.3`); cleanup on `change.removed`/disconnect/pointer-leave.
- `src/store/hooks.ts` — `useOthers()` / `usePresence()` from awareness.
- `src/canvas/CursorsLayer.tsx` — render from `useOthers()` + camera transform (delete the lissajous).
- `src/canvas/coords.ts` — screen↔canvas helpers used by broadcast + render.
- Advisory locks: derive `locks` (tableId→userId) from peers' `activity:{editing,tableId}`; block
  drag/field-edit on locked tables and show the lock badge (already styled).
- Local identity: pick name + color on first use, persisted in localStorage (no accounts).

## Public contract
```ts
export function useOthers(): PresenceState[];     // remote peers
export function usePresence(): { setCursor(p:{x:number;y:number}|null): void; setSelection(ids:string[]): void; setActivity(a: Activity): void };
```

## Acceptance criteria
- In two windows, moving the mouse in A shows a smooth labeled cursor in B at the correct logical
  point across different zoom/pan; closing A removes its cursor.
- Presence avatars + People list reflect who is connected and what they're viewing/editing.
- Editing a table shows the advisory lock badge to others and blocks their drag/edit.
- No per-pointermove Yjs doc writes (awareness only); depcruise green.

## How to verify
Run sync server; open two windows on one room; move/select/edit; observe cursors, avatars, locks; close a window.
