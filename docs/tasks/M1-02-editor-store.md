# M1-02 — Editor store (zustand) + typed hooks
Status: todo
Milestone: M1
Depends on: M1-01

## Goal
A zustand-backed store holding the editor's read-model and write actions, exposed via typed hooks.
This is the **only** surface the UI uses for diagram state — so the local-state→Yjs swap in M5 is
invisible to components.

## Context / links
- Plan: "State / store layering". Architecture: data-flow diagram in `docs/architecture.md`.
- For M1 the store is backed by **plain in-memory state** seeded from a `Diagram`. In M5 the same
  actions/selectors are reimplemented over Yjs (`@collab`) without changing the hook signatures.

## Files to touch
- `src/store/store.ts` — zustand store of a `Diagram` + selection + tool.
- `src/store/hooks.ts` — `useTables()`, `useTable(id)`, `useRelationships()`, `useSelection()`,
  `useTool()`, `useDiagramMeta()`, and write actions
  `addTable, updateTable, moveTable, addField, updateField, reorderField, addRelationship,
   deleteEntity, commitDrag`.
- `src/store/index.ts` + `src/store/README.md` (document the hook contract).
- Tests: `src/store/*.test.ts`.

## Public contract
```ts
export function useTables(): Table[];
export function useSelection(): [string | null, (id: string | null) => void];
export function useEditorActions(): {
  moveTable(id: string, x: number, y: number): void;
  commitDrag(id: string, x: number, y: number): void; // M5: one Yjs transaction on drag-end
  addRelationship(/* … */): void;
  deleteEntity(id: string): void;
  /* … */
};
```

## Acceptance criteria
- Components can read/write all diagram state through hooks; no component imports `@core` mutation
  internals directly or `yjs` at all (depcruise passes).
- Selectors are granular (moving one table doesn't re-render every consumer).
- `commitDrag` exists as a distinct action (M5 maps drag-move→awareness, drag-end→transaction).

## How to verify
`bun run typecheck && bun run lint && bun run depcruise && bun run test`
