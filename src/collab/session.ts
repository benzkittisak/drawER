/**
 * CollabSession — owns the live Yjs document for the open diagram, its providers, and presence.
 *
 *  - y-indexeddb: always-on local persistence (offline-first). On first open the doc is empty,
 *    so we populate it from the passed-in diagram; thereafter the CRDT state in IndexedDB wins.
 *  - y-websocket: connected on every diagram open (same room id `drawer-<diagramId>`) so anyone
 *    on that diagram sees live edits and presence — no Share click required.
 *  - Y.UndoManager scoped to LOCAL_ORIGIN so each user undoes only their own edits.
 *  - Awareness: live cursors / selection / activity while the websocket is connected.
 *
 * Snapshots of the doc (plain `Diagram`) and presence (RemotePresence[]) are pushed to listeners
 * (the store). This is the only place that touches Yjs / y-protocols.
 */
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import type { Diagram } from '@core';
import { createDoc, isEmpty, LOCAL_ORIGIN, type DocMaps } from './ydoc';
import { mut, readDiagram, writeDiagram } from './schema';
import { commentMut, readComments, type Comment, type CommentReply } from './comments';
import { pushActivity, readActivity, type ActivityEntry } from './activity';
import {
  readOthers,
  setLocalPresence,
  setLocalUser,
  type Activity,
  type PresenceUser,
  type RemotePresence,
} from './awareness';

export type ConnectionStatus = 'local' | 'connecting' | 'connected';
export interface ConnectionState {
  status: ConnectionStatus;
  isShared: boolean;
  roomId: string | null;
}

type SnapshotListener = (d: Diagram) => void;
type ConnectionListener = (c: ConnectionState) => void;
type OthersListener = (others: RemotePresence[]) => void;
type CommentsListener = (comments: Comment[]) => void;
type ActivityListener = (activity: ActivityEntry[]) => void;

const SYNC_URL = (import.meta.env.VITE_SYNC_URL as string | undefined) || 'ws://localhost:1234';

class CollabSession {
  private doc: Y.Doc | null = null;
  private maps: DocMaps | null = null;
  private idb: IndexeddbPersistence | null = null;
  private ws: WebsocketProvider | null = null;
  private undoMgr: Y.UndoManager | null = null;

  private onSnapshot: SnapshotListener | null = null;
  private onConnection: ConnectionListener | null = null;
  private onOthers: OthersListener | null = null;
  private onComments: CommentsListener | null = null;
  private onActivity: ActivityListener | null = null;

  private identity: PresenceUser | null = null;
  private roomId: string | null = null;
  private readonly = false;
  private observer = (): void => this.scheduleFlush();
  private commentsObserver = (): void => {
    if (this.maps) this.onComments?.(readComments(this.maps));
  };
  private activityObserver = (): void => {
    if (this.maps) this.onActivity?.(readActivity(this.maps));
  };
  /** Push the current remote awareness states into the store (also run once after connect). */
  private flushPresence = (): void => {
    if (this.ws) this.onOthers?.(readOthers(this.ws.awareness));
  };

  private wireWebsocket(provider: WebsocketProvider): void {
    if (this.identity) setLocalUser(provider.awareness, this.identity);
    provider.awareness.on('change', this.flushPresence);
    provider.on('status', () => {
      this.emitConnection();
      if (provider.wsconnected) this.flushPresence();
    });
    provider.on('sync', (synced: boolean) => {
      if (synced) this.flushPresence();
    });
  }
  private flushScheduled = false;

  /**
   * Open a diagram. Local-first (IndexedDB) AND always connected to the server DB so data
   * persists server-side and teammates are live. Seeds from `diagram` only if neither
   * IndexedDB nor the server already had it (so opening an existing diagram on a new device,
   * or with a stale blank, doesn't clobber the stored copy).
   */
  async open(diagram: Diagram, onSnapshot: SnapshotListener): Promise<void> {
    this.teardown();
    const { doc, maps } = createDoc();
    this.doc = doc;
    this.maps = maps;
    this.onSnapshot = onSnapshot;
    this.roomId = diagram.id;

    this.idb = new IndexeddbPersistence(`drawer-${diagram.id}`, doc);
    await this.idb.whenSynced;

    // Always connect to the server (real DB-backed). Presence is active whenever connected.
    this.ws = new WebsocketProvider(SYNC_URL, `drawer-${diagram.id}`, doc, { connect: true });
    this.wireWebsocket(this.ws);
    await waitForSync(this.ws, 1200);
    this.flushPresence();

    if (isEmpty(maps) && !this.readonly) {
      doc.transact(() => writeDiagram(maps, diagram), 'load');
    }

    this.undoMgr = new Y.UndoManager([maps.meta, maps.tables, maps.rels, maps.aux], {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
    });

    maps.tables.observeDeep(this.observer);
    maps.rels.observeDeep(this.observer);
    maps.meta.observe(this.observer);
    maps.aux.observe(this.observer);
    maps.comments.observeDeep(this.commentsObserver);
    maps.activity.observe(this.activityObserver);

    this.flush();
    this.commentsObserver();
    this.activityObserver();
    this.emitConnection();
  }

  private scheduleFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    queueMicrotask(() => {
      this.flushScheduled = false;
      this.flush();
    });
  }
  private flush(): void {
    if (this.maps) this.onSnapshot?.(readDiagram(this.maps));
  }

  snapshot(): Diagram | null {
    return this.maps ? readDiagram(this.maps) : null;
  }

  setReadonly(flag: boolean): void {
    this.readonly = flag;
  }

  /** Run a mutation inside a transaction tagged as a local edit. */
  transact(fn: (maps: DocMaps) => void): void {
    if (this.readonly || !this.doc || !this.maps) return;
    const maps = this.maps;
    this.doc.transact(() => fn(maps), LOCAL_ORIGIN);
  }

  // ---- undo/redo ----
  undo(): void {
    if (this.readonly) return;
    this.undoMgr?.undo();
  }
  redo(): void {
    if (this.readonly) return;
    this.undoMgr?.redo();
  }
  canUndo(): boolean {
    return (this.undoMgr?.undoStack.length ?? 0) > 0;
  }
  canRedo(): boolean {
    return (this.undoMgr?.redoStack.length ?? 0) > 0;
  }

  // ---- listeners ----
  onConnectionChange(cb: ConnectionListener): void {
    this.onConnection = cb;
  }
  onOthersChange(cb: OthersListener): void {
    this.onOthers = cb;
  }
  onCommentsChange(cb: CommentsListener): void {
    this.onComments = cb;
  }
  onActivityChange(cb: ActivityListener): void {
    this.onActivity = cb;
  }

  // ---- comments / activity ----
  addComment(c: Comment): void {
    this.transact((m) => commentMut.add(m, c));
  }
  resolveComment(id: string): void {
    this.transact((m) => commentMut.resolve(m, id));
  }
  addReply(id: string, reply: CommentReply): void {
    this.transact((m) => commentMut.reply(m, id, reply));
  }
  logActivity(entry: ActivityEntry): void {
    this.transact((m) => pushActivity(m, entry));
  }

  // ---- version snapshots ----
  getStateUpdate(): Uint8Array | null {
    return this.doc ? Y.encodeStateAsUpdate(this.doc) : null;
  }
  /** Replace the current diagram structure with a snapshot's (keeps comments/activity). */
  restoreDiagram(diagram: Diagram): void {
    this.transact((m) => {
      m.tables.clear();
      m.rels.clear();
      m.aux.clear();
      writeDiagram(m, diagram);
    });
  }

  setIdentity(user: PresenceUser): void {
    this.identity = user;
    if (this.ws) setLocalUser(this.ws.awareness, user);
  }
  getRoomId(): string | null {
    return this.roomId;
  }

  // ---- presence (no-ops when not in a room) ----
  setCursor(cursor: { x: number; y: number } | null): void {
    if (this.ws) setLocalPresence(this.ws.awareness, { cursor });
  }
  setSelection(selection: string[]): void {
    if (this.ws) setLocalPresence(this.ws.awareness, { selection });
  }
  setActivity(activity: Activity): void {
    if (this.ws) setLocalPresence(this.ws.awareness, { activity });
  }

  // ---- sharing ----
  /** Diagrams are always connected to the server on open; this just (re)connects if the user
   *  left, and returns the shareable link. */
  shareRoom(): string {
    if (!this.doc || !this.roomId) return '';
    if (!this.ws) {
      this.ws = new WebsocketProvider(SYNC_URL, `drawer-${this.roomId}`, this.doc, { connect: true });
      this.wireWebsocket(this.ws);
      this.emitConnection();
      this.flushPresence();
    }
    return this.shareUrl(this.roomId);
  }

  /** Read-only iframe URL for embedding this diagram on another site. */
  embedUrl(id?: string): string {
    const room = id ?? this.roomId;
    if (!room) return '';
    const origin = typeof location !== 'undefined' ? location.origin : '';
    return `${origin}/?embed=1&room=${encodeURIComponent(room)}`;
  }

  /** Go offline (stop syncing/presence) without closing the diagram. */
  leaveRoom(): void {
    this.disconnect();
    this.onOthers?.([]);
    this.emitConnection();
  }

  private disconnect(): void {
    if (this.ws) {
      this.ws.awareness.off('change', this.flushPresence);
      this.ws.destroy();
      this.ws = null;
    }
  }

  private shareUrl(id: string): string {
    const origin = typeof location !== 'undefined' ? location.origin : '';
    return `${origin}/?room=${encodeURIComponent(id)}`;
  }

  private emitConnection(): void {
    const status: ConnectionStatus = this.ws ? (this.ws.wsconnected ? 'connected' : 'connecting') : 'local';
    this.onConnection?.({ status, isShared: !!this.ws, roomId: this.roomId });
  }

  private teardown(): void {
    this.readonly = false;
    if (this.maps) {
      this.maps.tables.unobserveDeep(this.observer);
      this.maps.rels.unobserveDeep(this.observer);
      this.maps.meta.unobserve(this.observer);
      this.maps.aux.unobserve(this.observer);
      this.maps.comments.unobserveDeep(this.commentsObserver);
      this.maps.activity.unobserve(this.activityObserver);
    }
    this.disconnect();
    this.undoMgr?.destroy();
    this.idb?.destroy();
    this.doc?.destroy();
    this.doc = this.maps = this.idb = this.undoMgr = null;
  }
}

/** Resolve once the provider has done its initial server sync, or after `ms` (offline tolerant). */
function waitForSync(provider: WebsocketProvider, ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (provider.synced) return resolve();
    let done = false;
    const onSync = (isSynced: boolean): void => {
      if (isSynced) finish();
    };
    const finish = (): void => {
      if (done) return;
      done = true;
      provider.off('sync', onSync);
      resolve();
    };
    provider.on('sync', onSync);
    setTimeout(finish, ms);
  });
}

export const session = new CollabSession();
export { mut };

/** Decode a version snapshot (Yjs update) into a plain Diagram, off to the side. */
export function decodeDiagramSnapshot(update: Uint8Array): Diagram {
  const { doc, maps } = createDoc();
  Y.applyUpdate(doc, update);
  const d = readDiagram(maps);
  doc.destroy();
  return d;
}
