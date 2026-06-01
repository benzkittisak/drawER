# ADR 0002 — Custom DOM + SVG canvas (not React Flow / tldraw)

**Status:** Accepted · **Date:** 2026-06-01

## Context
The editor canvas must match the supplied design pixel-for-pixel: absolutely-positioned table
nodes inside a single transformed container, an SVG edge layer with cubic-bezier paths and a
midpoint cardinality label, **per-field FK grips** for drag-to-link, dashed lock borders + badges,
and overlay cursors/comment-pins in canvas coordinates. The design prototype already implements
pan (bg-drag + wheel), ctrl/⌘+wheel zoom-to-pointer, node drag, and live FK linking.

## Decision
Port the prototype's interaction model into a typed, store-bound custom canvas
(`src/canvas/`). No third-party graph/canvas library.

## Why not the alternatives
- **React Flow (@xyflow/react):** would mean fighting its node/edge styling and handle model to
  reproduce a bespoke look (field-row anchors, cardinality labels, lock chrome) with no payoff;
  we'd be customizing nearly everything anyway.
- **tldraw:** a freeform whiteboard, not a field-anchored node-graph, and **not MIT** (paid for
  commercial) — disqualified by the closed-source/permissive constraint (ADR 0003).
- **Plain SVG-only:** we already use DOM nodes + an SVG edge layer, which is the prototype's
  proven approach.

## Consequences
- We own pan/zoom/drag/selection math (~one component; already ported and working in M0).
- Re-evaluate only if a future feature needs heavy graph tooling (auto-routing, large-graph
  virtualization) that would be cheaper to adopt than build.
