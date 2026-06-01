# @core — domain model + engine (pure)

Framework-agnostic library: **no React, DOM, IndexedDB, or Yjs** (enforced by dependency-cruiser).
Deterministic and unit-testable in plain Node. Everything the rest of the app needs is re-exported
from `src/core/index.ts`.

## Public API (current)
```ts
// model
import { Diagram, Table, Field, Relationship, /* … */, DialectId, Cardinality, RefAction } from '@core';
import { createDiagram, createTable, createField, createRelationship, /* … */ } from '@core';
import { validateDiagram, isDiagram } from '@core';
// type catalogs
import { CATALOGS, TYPE_KEYS, typeDef, type TypeDef } from '@core';
import { newId } from '@core';
```

- **Model** (`model/`) mirrors `schemas/saved-diagram.schema.json` exactly. `Field.type` is a
  **canonical catalog key** (`'uuid' | 'varchar' | 'int4' | 'enum' | …`), not a SQL string.
- **Factories** (`model/factory.ts`) take ids as params (deterministic); use `newId()` for runtime ids.
- **Catalogs** (`catalog/`) map canonical keys → per-dialect SQL names + capabilities; the SQL
  engine and UI type pickers are catalog-driven.

## Coming (per docs/tasks/)
- `sql/export` — `exportSql(diagram, dialect, opts)` via the `Dialect` strategy (M2).
- `sql/import`, `dbml/`, `mermaid/`, `markdown/`, `layout/` (M3).
- `serialize/` — `serialize`/`parse` for the JSON format + `migrate()` (M4).

## Rules
Pure functions only — no `Date.now()`/random inside engine functions (inject them) so golden tests
are stable. Add unit tests next to the code (`*.test.ts`).
