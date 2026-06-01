# ADR 0001 — Yjs (CRDT) for real-time sync, self-hosted

**Status:** Accepted · **Date:** 2026-06-01

## Context
The product's headline feature is multiplayer editing with live cursors. We need concurrent
editing that merges without conflicts, plus an ephemeral presence channel for cursors/selections.
Storage is local-first with optional room sync; no mandatory backend at first.

## Decision
Use **Yjs** (a mature CRDT library) as the runtime source of truth, with:
- `y-indexeddb` for always-on local persistence (offline-first),
- `y-websocket` (later Hocuspocus) as the optional, self-hosted sync server,
- the **Awareness protocol** for cursors/presence/selection (ephemeral, auto-clears on disconnect).

## Why not the alternatives
- **Liveblocks / Convex / PartyKit (SaaS):** fastest to ship but paid + vendor lock-in and weaker
  offline story; conflicts with "no mandatory backend / local-first / commercial cost control."
- **Automerge:** capable CRDT but smaller ecosystem and no built-in presence.
- **OT / hand-rolled sync:** high risk, not worth it versus a proven CRDT.

## Consequences
- Yjs lives **only** in `src/collab` (enforced by dependency-cruiser); UI talks to `@store` hooks.
- The diagram is modeled as Yjs shared types mirroring `core/model` (per-entity Y.Map, fields as
  Y.Array, fractional-index ordering). See `docs/architecture.md`.
- Cursor positions are stored in **canvas coordinates** and transformed per-viewer.
