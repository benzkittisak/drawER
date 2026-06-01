# ADR 0003 — Clean-room, closed-source, permissive dependencies only

**Status:** Accepted · **Date:** 2026-06-01

## Context
drawdb is licensed **AGPL-3.0** (copyleft + network clause). This product is **closed-source /
commercial**. Copying or adapting AGPL code — or shipping an AGPL dependency in a networked
service — would force us to release source.

## Decision
- **Never read or copy drawdb's source.** Reimplement behavior from authoritative references:
  vendor SQL manuals (MySQL/PostgreSQL/SQLite/MSSQL/MariaDB/Oracle) and the public DBML spec.
  Cite sources in code comments to evidence independent creation. (Facts/interfaces — dialect
  rules, type catalogs — aren't copyrightable; expression is.)
- **Every dependency must be permissive:** MIT / Apache-2.0 / BSD / ISC. No GPL/AGPL/EPL.

## Verified-safe dependencies (planned)
React, Vite, TypeScript, zustand, Yjs + y-indexeddb + y-websocket (MIT); `node-sql-parser`
(Apache-2.0 — **not** the GPL namesakes `node-sqlparser` / `@kiyo5hi/node-sql-parser`);
`@dbml/core` (Apache-2.0); `dagre` (MIT — **avoid** `elkjs`/EPL-2.0); `html-to-image`, `jspdf` (MIT).

## Consequences
- A dependency-license check is part of the quality gates; a third-party-licenses/credits screen
  ships with the app (attribution is required even for permissive licenses).
- The design assets (`styles.css`, prototype JSX) are the **user's own** Claude Design output and
  are adopted directly.
