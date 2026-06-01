/**
 * Editor store — the single source of truth for editor state, exposed to the UI exclusively
 * through the hooks in ./hooks.ts.
 *
 * Backed by the Yjs document (@collab): write actions run as Yjs transactions and the session
 * pushes a derived `Diagram` snapshot back into this store; the hook API is unchanged from M1.
 * `moveTable` is optimistic+local (high-frequency drag, no doc write); `commitDrag` writes the
 * final position once as a transaction. Presence (cursors/selection/activity) flows through the
 * session's awareness and lands in `others`.
 */
import { create } from 'zustand';
import type { Diagram, Field, Id, Relationship, Table } from '@core';
import { createDiagram } from '@core';
import {
  getLocalIdentity,
  mut,
  session,
  type Activity,
  type ConnectionState,
  type PresenceUser,
  type RemotePresence,
} from '@collab';

export type Tool = 'select' | 'pan' | 'rel' | 'comment' | 'note';

export interface EditorState {
  diagram: Diagram;
  selected: Id | null;
  tool: Tool;
  connection: ConnectionState;
  others: RemotePresence[];
  identity: PresenceUser;

  // editor ui
  setSelected: (id: Id | null) => void;
  setTool: (t: Tool) => void;

  // diagram lifecycle (open a diagram's Yjs doc)
  loadDiagram: (d: Diagram) => void;

  // diagram mutations
  renameDiagram: (name: string) => void;
  addTable: (table: Table) => void;
  updateTable: (id: Id, patch: Partial<Omit<Table, 'id' | 'fields' | 'indices'>>) => void;
  moveTable: (id: Id, x: number, y: number) => void;
  commitDrag: (id: Id, x: number, y: number) => void;
  addField: (tableId: Id, field: Field) => void;
  updateField: (tableId: Id, fieldId: Id, patch: Partial<Omit<Field, 'id'>>) => void;
  removeField: (tableId: Id, fieldId: Id) => void;
  reorderField: (tableId: Id, fieldId: Id, toIndex: number) => void;
  addRelationship: (rel: Relationship) => void;
  deleteEntity: (id: Id) => void;

  // collaboration
  shareRoom: () => string;
  leaveRoom: () => void;
  undo: () => void;
  redo: () => void;

  // presence
  setCursor: (p: { x: number; y: number } | null) => void;
  setSelectionPresence: (ids: string[]) => void;
  setActivity: (a: Activity) => void;
}

const EMPTY = createDiagram('untitled', 'Untitled diagram', 'postgres');
const IDENTITY = getLocalIdentity();

export const useEditorStore = create<EditorState>((set, get) => ({
  diagram: EMPTY,
  selected: null,
  tool: 'select',
  connection: { status: 'local', isShared: false, roomId: null },
  others: [],
  identity: IDENTITY,

  setSelected: (id) => set({ selected: id }),
  setTool: (t) => set({ tool: t }),

  loadDiagram: (d) => {
    set({ diagram: d, selected: null });
    void session.open(d, (snap) => set({ diagram: snap }));
  },

  renameDiagram: (name) => session.transact((m) => mut.renameDiagram(m, name)),
  addTable: (table) => session.transact((m) => mut.addTable(m, table)),
  updateTable: (id, patch) => session.transact((m) => mut.updateTable(m, id, patch)),

  // optimistic, local-only during drag (no doc write); peers see the awareness 'dragging' activity
  moveTable: (id, x, y) =>
    set((s) => ({
      diagram: { ...s.diagram, tables: s.diagram.tables.map((t) => (t.id === id ? { ...t, position: { x, y } } : t)) },
    })),
  commitDrag: (id, x, y) => session.transact((m) => mut.setTablePosition(m, id, x, y)),

  addField: (tableId, field) => session.transact((m) => mut.addField(m, tableId, field)),
  updateField: (tableId, fieldId, patch) => session.transact((m) => mut.updateField(m, tableId, fieldId, patch)),
  removeField: (tableId, fieldId) => session.transact((m) => mut.removeField(m, tableId, fieldId)),
  reorderField: (tableId, fieldId, toIndex) => session.transact((m) => mut.reorderField(m, tableId, fieldId, toIndex)),
  addRelationship: (rel) => session.transact((m) => mut.addRelationship(m, rel)),
  deleteEntity: (id) => {
    if (get().selected === id) set({ selected: null });
    session.transact((m) => mut.deleteEntity(m, id));
  },

  shareRoom: () => session.shareRoom(),
  leaveRoom: () => session.leaveRoom(),
  undo: () => session.undo(),
  redo: () => session.redo(),

  setCursor: (p) => session.setCursor(p),
  setSelectionPresence: (ids) => session.setSelection(ids),
  setActivity: (a) => session.setActivity(a),
}));

// Wire session → store (connection + presence). Identity is set once for this browser.
session.setIdentity(IDENTITY);
session.onConnectionChange((c) => useEditorStore.setState({ connection: c }));
session.onOthersChange((others) => useEditorStore.setState({ others }));
