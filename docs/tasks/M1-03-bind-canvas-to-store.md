# M1-03 — Bind Canvas/panels to the store (replace seed data)
Status: todo
Milestone: M1
Depends on: M1-02

## Goal
Drive the Editor view from the store (`@store`) instead of local React state + `@data/seed`, using
the real `core/model` `Diagram`. The canvas becomes a true editor (create/move/edit tables and
fields, link relationships) on the canonical model.

## Context / links
- Current code: `src/views/Editor.tsx` holds `useState(seed.tables)`; `src/canvas/Canvas.tsx`
  takes `tables/setTables` props. Repoint these at the store.
- Keep the **exact** DOM/CSS (pixel target unchanged) — only the data source changes.
- Map `core` `Table.position.{x,y}` ↔ the canvas's `x/y`; `Field.primary` ↔ `pk`, FK derived from
  relationships rather than a `fk` boolean.

## Files to touch
- `src/canvas/Canvas.tsx`, `TableNode.tsx`, `RelationshipLayer.tsx` — consume store hooks; drag
  calls `moveTable` (live) + `commitDrag` (end); grip-link calls `addRelationship`.
- `src/views/Editor.tsx`, `panels/LeftPanel.tsx`, `panels/RightPanel.tsx` — read from hooks.
- `src/canvas/coords.ts` — screen↔canvas helpers (extract from Canvas).
- Replace `@data/seed` tables/rels usage with a seeded `Diagram` (keep seed users/comments/etc.
  for the still-mocked collab UI until M5/M6).

## Public contract
No new external API; this wires existing UI to `@store` hooks from M1-02.

## Acceptance criteria
- Editing a table/field/relationship updates the model via store actions (verified by a test or
  by observing the Left panel reflect canvas edits and vice-versa).
- Dragging a table calls `moveTable` during drag and `commitDrag` once on mouse-up.
- Views render identically to M0 (no visual regression vs `docs/design-reference/_check`).
- depcruise still green (no `yjs` import in UI).

## How to verify
`bun run build && bun run dev` → drag tables, add a relationship via a field grip, rename in panel;
confirm state stays consistent. `bun run test`.
