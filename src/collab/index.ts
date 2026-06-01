/** @collab public surface — the session orchestrator + mutators. The only module touching Yjs. */
export { session, mut, decodeDiagramSnapshot } from './session';
export { encodeDiagramState } from './encode';
export { loadDiagramFromIndexedDB, listIndexedDiagramIds } from './idbSnapshot';
export type { ConnectionState, ConnectionStatus } from './session';
export type { DocMaps } from './ydoc';
export * from './awareness';
export type { Comment, CommentReply } from './comments';
export type { ActivityEntry } from './activity';
export { listVersions, saveVersion, restoreVersion, diffVersion } from './versions';
export type { VersionMeta, DiffTag } from './versions';
