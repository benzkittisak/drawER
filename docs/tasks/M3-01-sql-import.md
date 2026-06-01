# M3-01 — SQL import (node-sql-parser → neutral AST → model)
Status: todo
Milestone: M3
Depends on: M2-01

## Goal
Parse existing SQL DDL into a `Diagram`, inferring tables, fields, and relationships from FK
constraints, then auto-layout positions.

## Context / links
- Plan: "Import". Use **`node-sql-parser` (Apache-2.0)** — verify license at install; do **not**
  install the GPL namesakes `node-sqlparser` / `@kiyo5hi/node-sql-parser` (ADR 0003).
- Insulate from the lib via our own neutral AST so we can swap parsers per dialect later.
- Coverage: prioritize PostgreSQL/MySQL/SQLite; surface "partially imported" warnings for the
  weaker Oracle/MSSQL paths instead of failing.

## Files to touch
- `src/core/sql/ast/` — neutral AST types.
- `src/core/sql/import/parse.ts` — `importSql(sql, dialect): { diagram: Diagram; warnings: string[] }`.
- `src/core/sql/import/normalize/` — parser-AST → neutral AST → model.
- `src/core/layout/autoLayout.ts` — **dagre** (MIT) positions for imported tables.
- Tests + round-trip goldens: `model → exportSql → importSql → model'` structural equality.

## Public contract
```ts
export function importSql(sql: string, dialect: DialectId): { diagram: Diagram; warnings: string[] };
```

## Acceptance criteria
- A sample `schema.sql` (PG/MySQL/SQLite) imports into a correct `Diagram` with relationships and laid-out positions.
- Round-trip tests pass for the golden set (modulo positions).
- `node-sql-parser` confirmed Apache-2.0 in the dependency tree; depcruise/lint green.

## How to verify
`npm test`; `npm run dev` → Import a sample SQL file and see tables appear.
