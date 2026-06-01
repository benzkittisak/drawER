# M2-01 — SQL export: Dialect framework + ddlBuilder
Status: todo
Milestone: M2
Depends on: M1-01

## Goal
A dialect-strategy export engine: `exportSql(diagram, dialectId, opts)` turns a `Diagram` into DDL,
delegating every dialect-specific decision to a `Dialect` implementation. Adding a database = one
new file, no builder edits.

## Context / links
- Plan: "SQL engine". ADR 0003 (clean-room — encode from vendor docs, cite sources; do not read drawdb).
- Pure & deterministic (inject ids; no `Date.now()`), so golden tests are stable.

## Files to touch
- `src/core/sql/export/Dialect.ts` — the interface (below) + `ExportOptions`, `DialectCtx`, `AutoIncrementPlan`.
- `src/core/sql/export/BaseDialect.ts` — ANSI-ish defaults dialects extend.
- `src/core/sql/export/ddlBuilder.ts` — walks the model, emits preambles → CREATE TABLE → indices → FKs.
- `src/core/sql/export/index.ts` — `exportSql(diagram, dialectId, opts?)` + dialect registry.
- Test harness: `src/core/sql/__tests__/golden.test.ts` reading `golden/<case>/model.json` and
  comparing to `expected/<dialect>.sql`; add `--update-goldens` support.

## Public contract
```ts
export interface Dialect {
  readonly id: DialectId;
  quoteIdent(name: string): string;
  quoteString(v: string): string;
  renderType(field: Field, ctx: DialectCtx): string;
  renderAutoIncrement(field: Field, ctx: DialectCtx): AutoIncrementPlan;
  renderColumnConstraints(field: Field): string;
  renderPrimaryKey(table: Table): string | null;
  renderForeignKey(rel: Relationship, ctx: DialectCtx): string;
  renderIndex(index: Index, table: Table): string;
  renderEnumPreamble(enums: EnumType[]): string[];
  renderCustomTypePreamble(types: CustomType[]): string[];
  supportsInlineEnum(): boolean;
  supportsSchemas(): boolean;
}
export function exportSql(d: Diagram, dialect: DialectId, opts?: ExportOptions): string;
```

## Acceptance criteria
- `exportSql` works end-to-end for at least one dialect (PostgreSQL, M2-02) via the framework.
- Golden-file test infra runs and is documented in `src/core/README.md`.
- `src/core/sql` stays pure (depcruise/lint green).

## How to verify
`bun run test` (golden tests). `bun run typecheck && bun run depcruise`.
