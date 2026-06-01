# M3-02 — DBML import/export + Mermaid/Markdown export
Status: todo
Milestone: M3
Depends on: M1-01

## Goal
Support DBML in and out, and one-way Mermaid ER + Markdown data-dictionary exports.

## Context / links
- Use **`@dbml/core` (Apache-2.0)** — verify license + that transitive deps are permissive (ADR 0003).
- Mermaid/Markdown are our own deterministic string emitters (pure `core`).

## Files to touch
- `src/core/dbml/import.ts` (`dbmlToDiagram`), `src/core/dbml/export.ts` (`diagramToDbml`).
- `src/core/mermaid/export.ts` (`diagramToMermaid`).
- `src/core/markdown/export.ts` (`diagramToMarkdown`).
- Tests incl. DBML round-trip.

## Public contract
```ts
export function diagramToDbml(d: Diagram): string;
export function dbmlToDiagram(dbml: string): { diagram: Diagram; warnings: string[] };
export function diagramToMermaid(d: Diagram): string;
export function diagramToMarkdown(d: Diagram): string;
```

## Acceptance criteria
- DBML round-trips (structural equality modulo positions). Mermaid renders a valid `erDiagram`.
- `@dbml/core` confirmed Apache-2.0; no copyleft transitive deps; depcruise/lint green.

## How to verify
`bun run test`; export a sample diagram to each format and eyeball.
