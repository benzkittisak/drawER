# M7-01 — Polish + deferred (preferences, shortcuts, i18n, accounts/backend)
Status: todo
Milestone: M7
Depends on: M6-01

## Goal
Production polish and the deferred backend that unlocks the design's team features.

## Context / links
- Plan: M7. The `tweaks-panel.jsx` from the prototype is **not** ported (it's the Claude Design
  host tool); its toggles become real preferences here.

## Scope (decompose into sub-tickets as needed)
- **Preferences:** accent color, dot grid, cursor-motion, comment-pins toggles → a real settings UI
  + persisted prefs (replaces the prototype tweaks).
- **Self-host fonts:** download Hanken Grotesk + JetBrains Mono woff2 into `src/styles/fonts/` and
  replace the Google Fonts `@import` in `styles.css` (offline / local-first).
- **Keyboard shortcuts:** V/H/T/R/C tools, undo/redo, delete, etc.
- **i18n:** `i18next` + `react-i18next` scaffolding + extract strings.
- **Performance:** large-diagram rendering (memoized nodes, virtualization if needed).
- **Credits screen:** generated third-party-licenses list (attribution requirement, ADR 0003).
- **Deferred backend (optional, larger):** accounts/auth + server-persisted diagrams + roles/
  permissions enforcement + team workspace + cross-diagram presence on the Dashboard. Pick an
  auth/provider and add an ADR before starting.

## Acceptance criteria
- Preferences persist and affect the editor; fonts load offline; shortcuts work; license/credits screen present.
- (If backend done) login + cloud diagrams + enforced roles; Dashboard shows real team + live status.

## How to verify
`bun run build`; manual pass over each item; for backend, an end-to-end auth + share + permission test.
