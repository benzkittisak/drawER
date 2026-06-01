# M2-02 — PostgreSQL dialect, then the rest
Status: todo
Milestone: M2
Depends on: M2-01

## Goal
Implement the six SQL dialects as `Dialect` strategies. **PostgreSQL first** (richest feature set),
then MySQL, SQLite, MSSQL, MariaDB, Oracle — each a single file overriding `BaseDialect` deltas.

## Context / links
- Encode rules from vendor manuals (cite the doc/URL in comments). ADR 0003. Do **not** read drawdb.
- Per-dialect notes from the plan:
  - **PostgreSQL** — `"quoting"`, `SERIAL`/`GENERATED … AS IDENTITY`, `CREATE TYPE … AS ENUM`, `JSONB`, schemas.
  - **MySQL/MariaDB** — backtick quoting, `AUTO_INCREMENT`, inline `ENUM('a','b')`, `ENGINE=InnoDB`.
  - **SQLite** — type affinity, `INTEGER PRIMARY KEY AUTOINCREMENT`, no native enum → `CHECK(col IN (...))`.
  - **MSSQL** — `[bracket]` quoting, `IDENTITY(1,1)`, `NVARCHAR`, `GO` batches, `dbo` schema.
  - **Oracle** — `NUMBER`/`VARCHAR2`, identity or sequence+trigger, no native boolean (`NUMBER(1)`).

## Files to touch
- `src/core/sql/export/postgres.ts` (first), then `mysql.ts`, `sqlite.ts`, `mssql.ts`, `mariadb.ts`, `oracle.ts`.
- Register each in the dialect registry (M2-01 `index.ts`).
- Golden fixtures: `src/core/sql/__tests__/golden/<case>/expected/<dialect>.sql` for a shared set of `model.json` cases.

## Public contract
Each file: `export const <dialect>: Dialect = …` (no new external API beyond M2-01's `exportSql`).

## Acceptance criteria
- All six dialects produce valid DDL for the golden model set; enums, PK/FK, auto-increment,
  quoting, and schemas behave per each vendor's rules.
- Golden files committed and stable; an intentional change is a reviewed golden diff.
- Editor "Export SQL" (wire a minimal dialog) shows output for the selected dialect.

## How to verify
`npm test`. Spot-check generated DDL against each engine's docs.
