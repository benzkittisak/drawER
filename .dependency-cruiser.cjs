/**
 * Module import boundaries for drawDB Live — see docs/conventions.md.
 *
 * The point: any agent can work inside one module against documented contracts
 * without the others leaking in. These rules fail CI, so they're not just convention.
 *
 *   src/core    — pure TS engine. Imports nothing app-side and no React/DOM/Yjs.
 *   src/collab  — the ONLY place Yjs lives.
 *   src/store   — bridges collab -> React via hooks.
 *   src/canvas / src/views / src/ui — UI. Never import Yjs directly; go through @store.
 */
module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'src/core must stay framework-agnostic and not depend on app modules.',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '^src/(collab|store|canvas|views|ui)' },
    },
    {
      name: 'core-no-react-dom-yjs',
      comment: 'src/core must not import React, ReactDOM, or Yjs — it is unit-testable in plain Node.',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: 'node_modules/(react|react-dom|yjs|y-indexeddb|y-websocket|y-protocols|zustand)' },
    },
    {
      name: 'ui-no-direct-yjs',
      comment: 'UI (canvas/views/ui) must reach collaborative state through @store hooks, never Yjs directly.',
      severity: 'error',
      from: { path: '^src/(canvas|views|ui)' },
      to: { path: 'node_modules/(yjs|y-indexeddb|y-websocket|y-protocols)' },
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies make modules impossible to reason about in isolation.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.app.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
  },
};
