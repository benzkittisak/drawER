# Task backlog

One markdown ticket per unit of work. This is the executable plan — **implementation = working
this backlog**. Pick a ticket whose dependencies are all `done`, set the matching task in your
tracker to in-progress, implement against the **Public contract**, and satisfy **Acceptance**.
Independent tickets (no shared dependency) can be worked concurrently by different agents.

## Ticket template
```md
# <ID> — <title>
Status: todo | in-progress | done
Milestone: M#
Depends on: <ID, ID> (or —)

## Goal
What outcome this produces, in one or two sentences.

## Context / links
Plan section, ADRs, design-reference files, prior tickets.

## Files to touch
Concrete paths to create/modify.

## Public contract
The exact types/functions other modules will import (the API surface). Keep it small.

## Acceptance criteria
Bullet list that must all be true to call this done.

## How to verify
Commands to run / what to observe.
```

## Status
**M0–M7 are implemented** (see `CLAUDE.md`). The tickets below remain as the record of scope and
acceptance criteria. Remaining/deferred work: accounts + server-persisted team workspace,
roles/permissions, cross-diagram presence (M7 backend), self-hosted fonts, i18n.

## Index (delivered)
| ID | Title | Milestone | Depends |
|----|-------|-----------|---------|
| M1-01 | Core domain model + factories + type catalogs | M1 | — |
| M1-02 | Editor store (zustand) + typed hooks | M1 | M1-01 |
| M1-03 | Bind Canvas/panels to the store (replace seed) | M1 | M1-02 |
| M2-01 | SQL export: Dialect framework + ddlBuilder | M2 | M1-01 |
| M2-02 | PostgreSQL dialect (then MySQL/SQLite/MSSQL/MariaDB/Oracle) | M2 | M2-01 |
| M3-01 | SQL import via node-sql-parser → neutral AST → model | M3 | M2-01 |
| M3-02 | DBML import/export + Mermaid/Markdown export | M3 | M1-01 |
| M4-01 | Local-first persistence (y-indexeddb) + diagram library | M4 | M1-02 |
| M4-02 | JSON interchange: serialize/parse + schema validation + migrate | M4 | M1-01 |
| M5-01 | Yjs document + providers (indexeddb/websocket) + sync server | M5 | M1-02 |
| M5-02 | Live cursors + presence via Awareness (replace fake) | M5 | M5-01 |
| M6-01 | Comments, activity feed, version history (snapshots/diffs) | M6 | M5-01 |
| M7-01 | Polish + deferred (prefs, shortcuts, i18n, accounts/backend) | M7 | M6-01 |

Add new tickets here as work is decomposed. Keep statuses in sync with the tracker.
