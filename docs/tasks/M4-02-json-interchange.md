# M4-02 — JSON interchange: serialize/parse + schema validation + migrate
Status: todo
Milestone: M4
Depends on: M1-01

## Goal
First-class, versioned JSON export/import for downstream reuse — the format documented in
`docs/json-format.md` and `schemas/saved-diagram.schema.json`.

## Context / links
- Plan: "JSON interchange format". Pure functions in `core` (no DOM/Yjs); deterministic round-trip.
- The exported file must validate against the published schema; importing an older `version`
  upgrades it via `migrate()`.

## Files to touch
- `src/core/serialize/json.ts` — `serialize(diagram): SavedDiagram`, `parse(json): Diagram` (validates).
- `src/core/serialize/schema.ts` — `CURRENT_VERSION`, `SavedDiagram` type (mirrors the JSON Schema).
- `src/core/serialize/migrate.ts` — `migrate(raw): SavedDiagram` applying sequential migrations.
- UI: "Export → JSON" downloads `.drawdb.json`; "Import JSON" reads + validates (in `views`/`store`).
- Tests: round-trip golden + a fixture for an older version through `migrate()` + schema-validation test
  (validate the produced JSON against `schemas/saved-diagram.schema.json`).

## Public contract
```ts
export const CURRENT_VERSION: number;
export interface SavedDiagram { version: number; exportedAt?: string; app: 'drawDB-live'; diagram: Diagram; }
export function serialize(d: Diagram): SavedDiagram;
export function parse(json: unknown): Diagram;     // throws on invalid; migrates old versions
```

## Acceptance criteria
- `serialize`→`parse` is lossless on the golden set (positions + ids preserved).
- Produced JSON validates against `schemas/saved-diagram.schema.json` (test asserts this).
- An older-version fixture loads via `migrate()`.

## How to verify
`npm test`; `npm run dev` → Export JSON, re-import, confirm identical diagram.
