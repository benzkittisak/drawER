/**
 * CollabSession — owns the live Yjs document for the open diagram, its providers, and presence.
 *
 *  - y-indexeddb: always-on local persistence (offline-first). On first open the doc is empty,
 *    so we populate it from the passed-in diagram; thereafter the CRDT state in IndexedDB wins.
 *  - y-websocket: attached lazily when the user shares a room; the SAME doc syncs up, so an
 *    offline diagram becomes a shared room with no migration step.
 *  - Y.UndoManager scoped to LOCAL_ORIGIN so each user undoes only their own edits.
 *  - Awareness: live cursors / selection / activity, only while connected to a room.
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

  private identity: PresenceUser | null = null;
  private roomId: string | null = null;
  private observer = (): void => this.scheduleFlush();
  private awarenessHandler = (): void => {
    if (this.ws) this.onOthers?.(readOthers(this.ws.awareness));
  };
  private flushScheduled = false;

  /** Open a diagram: fresh doc + IndexedDB; populate from `diagram` only if the doc is empty. */
  async open(diagram: Diagram, onSnapshot: SnapshotListener): Promise<void> {
    this.teardown();
    const { doc, maps } = createDoc();
    this.doc = doc;
    this.maps = maps;
    this.onSnapshot = onSnapshot;

    this.idb = new IndexeddbPersistence(`drawer-${diagram.id}`, doc);
    await this.idb.whenSynced;

    if (isEmpty(maps)) {
      doc.transact(() => writeDiagram(maps, diagram), 'load');
    }

    this.undoMgr = new Y.UndoManager([maps.meta, maps.tables, maps.rels, maps.aux], {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
    });

    maps.tables.observeDeep(this.observer);
    maps.rels.observeDeep(this.observer);
    maps.meta.observe(this.observer);
    maps.aux.observe(this.observer);

    this.flush();
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

  /** Run a mutation inside a transaction tagged as a local edit. */
  transact(fn: (maps: DocMaps) => void): void {
    if (!this.doc || !this.maps) return;
    const maps = this.maps;
    this.doc.transact(() => fn(maps), LOCAL_ORIGIN);
  }

  // ---- undo/redo ----
  undo(): void {
    this.undoMgr?.undo();
  }
  redo(): void {
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
  shareRoom(roomId?: string): string {
    if (!this.doc) return '';
    const id = roomId ?? (this.maps?.meta.get('id') as string) ?? 'untitled';
    if (this.ws && this.roomId === id) return this.shareUrl(id);
    this.disconnect();
    this.roomId = id;
    this.ws = new WebsocketProvider(SYNC_URL, `drawer-${id}`, this.doc, { connect: true });
    if (this.identity) setLocalUser(this.ws.awareness, this.identity);
    this.ws.awareness.on('change', this.awarenessHandler);
    this.ws.on('status', () => this.emitConnection());
    this.awarenessHandler();
    this.emitConnection();
    return this.shareUrl(id);
  }

  leaveRoom(): void {
    this.disconnect();
    this.roomId = null;
    this.onOthers?.([]);
    this.emitConnection();
  }

  private disconnect(): void {
    if (this.ws) {
      this.ws.awareness.off('change', this.awarenessHandler);
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
    if (this.maps) {
      this.maps.tables.unobserveDeep(this.observer);
      this.maps.rels.unobserveDeep(this.observer);
      this.maps.meta.unobserve(this.observer);
      this.maps.aux.unobserve(this.observer);
    }
    this.disconnect();
    this.undoMgr?.destroy();
    this.idb?.destroy();
    this.doc?.destroy();
    this.doc = this.maps = this.idb = this.undoMgr = null;
  }
}

export const session = new CollabSession();
export { mut };
