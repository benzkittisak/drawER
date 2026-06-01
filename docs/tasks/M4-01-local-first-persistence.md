# M4-01 — Local-first persistence + diagram library
Status: todo
Milestone: M4
Depends on: M1-02

## Goal
Persist diagrams locally so work survives reloads and is offline-first, and back the Dashboard
with a real list of saved diagrams (id, name, dialect, updatedAt, thumbnail).

## Context / links
- Plan: "Local-first persistence & the Dashboard". The live document is persisted by
  **`y-indexeddb`** once the Yjs layer lands (M5); until then, persist the store's `Diagram` JSON.
- Dashboard team features (members/roles/cross-diagram live) stay **deferred to M7**; show local +
  joined diagrams, label clearly.

## Files to touch
- `src/store/persistence.ts` (or `src/collab/persistence.ts` in M5) — load/save the active diagram.
- A small IndexedDB "library" store (native IndexedDB or Dexie/Apache-2.0 — verify license).
- `src/views/Dashboard.tsx` — read the library instead of `@data/seed`.
- Autosave (debounced) + library row `updatedAt`/thumbnail.

## Public contract
```ts
export function listDiagrams(): Promise<DiagramSummary[]>;
export function loadDiagram(id: string): Promise<Diagram | null>;
export function saveDiagram(d: Diagram): Promise<void>;
```

## Acceptance criteria
- Create/edit a diagram, reload the page → state restored.
- Dashboard lists real saved diagrams with metadata + thumbnail.
- Works with no network (offline).

## How to verify
`npm run dev` → edit, hard-reload, confirm persistence; toggle offline in devtools.
