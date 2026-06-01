# M1-01 — Core domain model + factories + type catalogs
Status: todo
Milestone: M1
Depends on: —

## Goal
Establish the canonical, framework-agnostic domain model in `src/core/model` — the single source
of truth that the SQL engine, the JSON format, and the Yjs document all mirror.

## Context / links
- Plan: "Domain data model" section. Schema contract: `schemas/saved-diagram.schema.json`.
- Must match the JSON Schema exactly (round-trip in M4-02). Keep it pure (ADR 0003, conventions).

## Files to touch
- `src/core/model/types.ts` — `Diagram, Table, Field, Index, Relationship, CustomType, EnumType,
  Note, Area, DialectId, Cardinality, RefAction, Id`.
- `src/core/model/factory.ts` — `createDiagram()`, `createTable()`, `createField()`, … returning
  fully-defaulted entities. Ids are **injected** (param) — no `crypto.randomUUID()` inside pure
  functions (determinism); a thin `newId()` wrapper may live outside `model/`.
- `src/core/model/guards.ts` — `isDiagram(x): x is Diagram` + basic invariant validation.
- `src/core/catalog/{postgres,mysql,sqlite,mssql,mariadb,oracle}.ts` + `index.ts` — `TypeDef`
  (`name, aliases?, hasSize?, hasScale?, defaultSize?, category`) and `CATALOGS: Record<DialectId, TypeCatalog>`.
- `src/core/index.ts` — re-export the public surface. `src/core/README.md` — document it.
- Tests: `src/core/model/*.test.ts`.

## Public contract
```ts
export type DialectId = 'mysql'|'mariadb'|'postgres'|'sqlite'|'mssql'|'oracle';
export interface Diagram { /* per schema */ }
export function createDiagram(id: Id, name: string, dialect: DialectId): Diagram;
export const CATALOGS: Record<DialectId, Record<string, TypeDef>>;
```

## Acceptance criteria
- Types match `schemas/saved-diagram.schema.json` field-for-field (names, optionality, enums).
- `src/core` imports nothing from app modules and no React/DOM/Yjs (depcruise passes).
- Factories produce schema-valid entities; guards reject malformed input.
- Unit tests cover factories + guards.

## How to verify
`bun run typecheck && bun run depcruise && bun run test`
