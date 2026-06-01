/** @collab public surface — the session orchestrator + mutators. The only module touching Yjs. */
export { session, mut } from './session';
export type { ConnectionState, ConnectionStatus } from './session';
export type { DocMaps } from './ydoc';
export * from './awareness';
