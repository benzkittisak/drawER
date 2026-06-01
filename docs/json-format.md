# JSON interchange format

JSON is **both** drawDB Live's native save format **and** a stable contract for downstream tools
and agents. A diagram exported as JSON can be re-imported losslessly, validated independently, and
consumed by other software.

- **Type:** `SavedDiagram` — implemented in `src/core/serialize/json.ts` (M4).
- **Schema:** [`schemas/saved-diagram.schema.json`](../schemas/saved-diagram.schema.json) (JSON
  Schema draft 2020-12). Validate any `.drawdb.json` against it.
- **File extension:** `.drawdb.json`.

## Shape
```jsonc
{
  "version": 1,                    // schema version; older files are upgraded by migrate()
  "exportedAt": "2026-06-01T10:00:00.000Z",
  "app": "drawDB-live",
  "diagram": {
    "id": "…",
    "name": "Core Product DB",
    "dialect": "postgres",         // mysql | mariadb | postgres | sqlite | mssql | oracle
    "tables": [
      {
        "id": "users",
        "name": "users",
        "color": "#6366f1",
        "position": { "x": 80, "y": 90 },
        "fields": [
          { "id": "u_id",  "name": "id",     "type": "uuid",    "primary": true },
          { "id": "u_org", "name": "org_id", "type": "uuid" },
          { "id": "u_em",  "name": "email",  "type": "varchar", "notNull": true, "unique": true }
        ],
        "indices": []
      }
    ],
    "relationships": [
      {
        "id": "r1",
        "name": "users_org_fk",
        "fromTableId": "users", "fromFieldId": "u_org",
        "toTableId": "orgs",   "toFieldId": "o_id",
        "cardinality": "many_to_one",
        "onDelete": "CASCADE", "onUpdate": "NO ACTION"
      }
    ],
    "notes": [],
    "areas": [],
    "customTypes": [],
    "enums": [],
    "meta": { "createdAt": 0, "updatedAt": 0 }
  }
}
```

## Guarantees
- **Round-trip:** `serialize(diagram)` → JSON and `parse(json)` → `Diagram` are inverse and
  deterministic (pure functions in `src/core`, no DOM/Yjs). Covered by round-trip tests.
- **Validated on import:** unknown/old files are checked against the schema, then run through
  `migrate()` to the current `version`.
- **Mirrors the runtime model:** the Yjs document mirrors `Diagram`, so `ydoc → Diagram → JSON`
  loses nothing. Positions and ids are preserved.

SQL / DBML / Mermaid exports are **one-way derivations** from the same `Diagram`; JSON is the only
format guaranteed to round-trip.
