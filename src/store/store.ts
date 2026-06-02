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
import type { Diagram, Field, Id, Index, Relationship, Table } from '@core';
import { createDiagram, createIndex, newId } from '@core';
import {
  getLocalIdentity,
  mut,
  saveVersion as persistVersion,
  restoreVersion as restoreVersionInDoc,
  session,
  type Activity,
  type ActivityEntry,
  type Comment,
  type ConnectionState,
  type PresenceUser,
  type RemotePresence,
  type VersionMeta,
} from '@collab';

export type Tool = 'select' | 'pan' | 'rel' | 'comment' | 'note';

export interface EditorState {
  diagram: Diagram;
  readonly: boolean;
  selected: Id | null;
  selectedRel: Id | null;
  tool: Tool;
  connection: ConnectionState;
  others: RemotePresence[];
  identity: PresenceUser;
  comments: Comment[];
  activity: ActivityEntry[];

  // editor ui
  setSelected: (id: Id | null) => void;
  setSelectedRel: (id: Id | null) => void;
  setTool: (t: Tool) => void;

  // diagram lifecycle (open a diagram's Yjs doc)
  loadDiagram: (d: Diagram) => void;
  setReadonly: (flag: boolean) => void;

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
  addIndex: (tableId: Id, index: Index) => void;
  updateIndex: (tableId: Id, indexId: Id, patch: Partial<Omit<Index, 'id'>>) => void;
  removeIndex: (tableId: Id, indexId: Id) => void;
  toggleFieldIndex: (tableId: Id, fieldId: Id) => void;
  addRelationship: (rel: Relationship) => void;
  updateRelationship: (id: Id, patch: Partial<Pick<Relationship, 'name' | 'cardinality' | 'onUpdate' | 'onDelete' | 'routeOffsetX'>>) => void;
  deleteEntity: (id: Id) => void;

  // collaboration
  shareRoom: () => string;
  embedUrl: () => string;
  leaveRoom: () => void;
  undo: () => void;
  redo: () => void;

  // presence
  setCursor: (p: { x: number; y: number } | null) => void;
  setSelectionPresence: (ids: string[]) => void;
  setActivity: (a: Activity) => void;

  // comments
  addComment: (input: { x: number; y: number; tableId: string | null; body: string }) => void;
  resolveComment: (id: string) => void;
  deleteComment: (id: string) => void;
  addReply: (id: string, body: string) => void;

  // versions
  saveVersion: (label: string) => VersionMeta | null;
  restoreVersion: (versionId: string) => void;
}

const EMPTY = createDiagram('untitled', 'Untitled diagram', 'postgres');
const IDENTITY = getLocalIdentity();

const canMutate = (get: () => EditorState): boolean => !get().readonly;

export const useEditorStore = create<EditorState>((set, get) => ({
  diagram: EMPTY,
  readonly: false,
  selected: null,
  selectedRel: null,
  tool: 'select',
  connection: { status: 'local', isShared: false, roomId: null },
  others: [],
  identity: IDENTITY,
  comments: [],
  activity: [],

  setSelected: (id) => set({ selected: id, selectedRel: null }),
  setSelectedRel: (id) => set({ selectedRel: id, selected: null }),
  setTool: (t) => set({ tool: t }),

  loadDiagram: (d) => {
    set({ diagram: d, selected: null, selectedRel: null });
    void session.open(d, (snap) => set({ diagram: snap }));
  },

  setReadonly: (flag) => {
    session.setReadonly(flag);
    set({ readonly: flag, tool: flag ? 'pan' : get().tool });
  },

  renameDiagram: (name) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.renameDiagram(m, name));
  },
  addTable: (table) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.addTable(m, table));
    logAct(get().identity, 'created table', table.name);
  },
  updateTable: (id, patch) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.updateTable(m, id, patch));
  },

  // optimistic, local-only during drag (no doc write); peers see the awareness 'dragging' activity
  moveTable: (id, x, y) => {
    if (!canMutate(get)) return;
    set((s) => ({
      diagram: { ...s.diagram, tables: s.diagram.tables.map((t) => (t.id === id ? { ...t, position: { x, y } } : t)) },
    }));
  },
  commitDrag: (id, x, y) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.setTablePosition(m, id, x, y));
  },

  addField: (tableId, field) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.addField(m, tableId, field));
  },
  updateField: (tableId, fieldId, patch) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.updateField(m, tableId, fieldId, patch));
  },
  removeField: (tableId, fieldId) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.removeField(m, tableId, fieldId));
  },
  reorderField: (tableId, fieldId, toIndex) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.reorderField(m, tableId, fieldId, toIndex));
  },
  addIndex: (tableId, index) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.addIndex(m, tableId, index));
  },
  updateIndex: (tableId, indexId, patch) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.updateIndex(m, tableId, indexId, patch));
  },
  removeIndex: (tableId, indexId) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.removeIndex(m, tableId, indexId));
  },
  toggleFieldIndex: (tableId, fieldId) => {
    if (!canMutate(get)) return;
    const table = get().diagram.tables.find((t) => t.id === tableId);
    if (!table) return;
    const containing = table.indices.filter((ix) => ix.fieldIds.includes(fieldId));
    if (containing.length > 0) {
      session.transact((m) => {
        for (const ix of containing) {
          if (ix.fieldIds.length === 1) mut.removeIndex(m, tableId, ix.id);
          else
            mut.updateIndex(m, tableId, ix.id, {
              fieldIds: ix.fieldIds.filter((id) => id !== fieldId),
            });
        }
      });
      return;
    }
    const field = table.fields.find((f) => f.id === fieldId);
    const ixName = field ? `ix_${table.name}_${field.name}` : `ix_${newId()}`;
    session.transact((m) => mut.addIndex(m, tableId, createIndex(newId(), ixName, [fieldId], false)));
  },
  addRelationship: (rel) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.addRelationship(m, rel));
    logAct(get().identity, 'linked', rel.name);
    set({ selectedRel: rel.id, selected: null });
  },
  updateRelationship: (id, patch) => {
    if (!canMutate(get)) return;
    session.transact((m) => mut.updateRelationship(m, id, patch));
  },
  deleteEntity: (id) => {
    if (!canMutate(get)) return;
    const tables = get().diagram.tables;
    const rels = get().diagram.relationships;
    const name =
      tables.find((t) => t.id === id)?.name ?? rels.find((r) => r.id === id)?.name ?? 'an item';
    if (get().selected === id) set({ selected: null });
    if (get().selectedRel === id) set({ selectedRel: null });
    session.transact((m) => mut.deleteEntity(m, id));
    logAct(get().identity, 'deleted', name);
  },

  shareRoom: () => session.shareRoom(),
  embedUrl: () => session.embedUrl(get().diagram.id),
  leaveRoom: () => session.leaveRoom(),
  undo: () => session.undo(),
  redo: () => session.redo(),

  setCursor: (p) => session.setCursor(p),
  setSelectionPresence: (ids) => session.setSelection(ids),
  setActivity: (a) => session.setActivity(a),

  addComment: ({ x, y, tableId, body }) => {
    if (!canMutate(get)) return;
    const me = get().identity;
    session.addComment({
      id: newId(),
      x,
      y,
      tableId,
      resolved: false,
      author: me.id,
      authorName: me.name,
      authorColor: me.color,
      body,
      createdAt: Date.now(),
      replies: [],
    });
    logAct(me, 'commented on', tableId ?? 'the canvas');
  },
  resolveComment: (id) => {
    if (!canMutate(get)) return;
    session.resolveComment(id);
  },
  deleteComment: (id) => {
    if (!canMutate(get)) return;
    session.deleteComment(id);
  },
  addReply: (id, body) => {
    if (!canMutate(get)) return;
    const me = get().identity;
    session.addReply(id, { author: me.id, authorName: me.name, authorColor: me.color, body, ts: Date.now() });
  },

  saveVersion: (label) => {
    if (!canMutate(get)) return null;
    return persistVersion(get().diagram.id, label, get().identity);
  },
  restoreVersion: (versionId) => {
    if (!canMutate(get)) return;
    restoreVersionInDoc(get().diagram.id, versionId);
  },
}));

function logAct(identity: PresenceUser, action: string, target: string): void {
  if (useEditorStore.getState().readonly) return;
  session.logActivity({
    id: newId(),
    who: identity.id,
    whoName: identity.name,
    whoColor: identity.color,
    action,
    target,
    ts: Date.now(),
  });
}

// Wire session → store (connection + presence). Identity is set once for this browser.
session.setIdentity(IDENTITY);
session.onConnectionChange((c) => useEditorStore.setState({ connection: c }));
session.onOthersChange((others) => useEditorStore.setState({ others }));
session.onCommentsChange((comments) => useEditorStore.setState({ comments }));
session.onActivityChange((activity) => useEditorStore.setState({ activity }));
