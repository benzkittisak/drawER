# Conventions

Rules every contributor (human or agent) follows. Most are enforced mechanically — a violation
fails `lint`, `typecheck`, or `depcruise`, not just review.

## Language & style
- **TypeScript `strict`**, no `any` (`@typescript-eslint/no-explicit-any` is an error). Prefer
  precise types and discriminated unions over casts.
- **Named exports** only (no default exports) so symbols are greppable and renames are safe.
- **One component per file**; file name matches the component (`TableNode.tsx` → `TableNode`).
- Prettier owns formatting: single quotes, semicolons, trailing commas, width 100. Run
  `npm run format`; don't hand-format.
- Unused vars are errors; prefix an intentionally-unused arg with `_`.
- Comment the **why**, not the **what**. Keep comments at the density of the surrounding file.

## Module import boundaries (enforced by `.dependency-cruiser.cjs`)
```
core  ──►  (nothing app-side; no React / DOM / Yjs / zustand)
collab ──►  core                     (the ONLY module that imports yjs / y-*)
store  ──►  core, collab
canvas ──►  core, store, ui          (never imports yjs directly)
views  ──►  core, store, canvas, ui  (never imports yjs directly)
ui     ──►  (self-contained)
```
- `src/core` is a **pure, framework-agnostic library**: deterministic, no `Date.now()` / random
  inside engine functions (inject ids/timestamps), no IndexedDB, no DOM. This is what keeps it
  unit-testable in plain Node and lets the SQL engine be reasoned about in isolation.
- UI reaches collaborative state **only through `@store` hooks** — never `import * as Y from 'yjs'`
  in a component. This is the seam that lets the canvas/views and the Yjs layer evolve separately.
- No circular dependencies.
- Use path aliases (`@core/…`), not deep relative paths across modules.

## Documented contracts
Each module exposes a small public API documented in its own `README.md` (added as the module is
built). Code against the documented contract of other modules — don't reach into their internals.
This is what lets several agents work in `core`, `canvas`, and `views` at the same time.

## Tests
- **Vitest.** Co-locate unit tests as `*.test.ts(x)` next to the code.
- The SQL engine uses **golden files**: `src/core/sql/__tests__/golden/<case>/model.json` +
  `expected/<dialect>.sql`. A test renders the model and compares; intentional changes are
  regenerated with the update script (added in M2), and the diff is reviewed.
- Engine round-trip tests assert `model → export → import → model'` structural equality.

## Git / PRs
- Small, focused commits with imperative subjects (`Add Postgres dialect export`).
- A change must pass `typecheck`, `lint`, `depcruise`, `test`, and `build` before commit.
- Reference the ticket id from `docs/tasks/` in the commit/PR (e.g. `M2-01`).
- Co-author trailer for AI-authored commits per repo policy.

## Working from the backlog
`docs/tasks/` holds one markdown ticket per unit of work, each with a fixed template
(Goal · Files · Public contract · Acceptance · Verify · Dependencies). Pick a ticket whose
dependencies are met, set it in progress, implement against the stated contract, and satisfy the
acceptance criteria. Independent tickets can be worked concurrently by different agents.
