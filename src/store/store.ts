/**
 * Editor store — the single source of truth for diagram + editor UI state, exposed to the UI
 * exclusively through the hooks in ./hooks.ts.
 *
 * M1: backed by plain in-memory state (a core `Diagram`). M5 reimplements these same actions
 * over Yjs (`@collab`) WITHOUT changing the action signatures or the hooks — so the canvas and
 * panels never change. `moveTable` (live, high-frequency) and `commitDrag` (once on drag-end)
 * are kept distinct precisely so M5 can route the former to awareness and the latter to a Yjs
 * transaction.
 */
import { create } from 'zustand';
import type { Diagram, Field, Id, Relationship, Table } from '@core';
import { createDiagram } from '@core';

export type Tool = 'select' | 'pan' | 'rel' | 'comment' | 'note';

export interface EditorState {
  diagram: Diagram;
  selected: Id | null;
  tool: Tool;

  // editor ui
  setSelected: (id: Id | null) => void;
  setTool: (t: Tool) => void;

  // diagram-level
  loadDiagram: (d: Diagram) => void;
  renameDiagram: (name: string) => void;

  // tables
  addTable: (table: Table) => void;
  updateTable: (id: Id, patch: Partial<Omit<Table, 'id' | 'fields' | 'indices'>>) => void;
  moveTable: (id: Id, x: number, y: number) => void;
  commitDrag: (id: Id, x: number, y: number) => void;

  // fields
  addField: (tableId: Id, field: Field) => void;
  updateField: (tableId: Id, fieldId: Id, patch: Partial<Omit<Field, 'id'>>) => void;
  removeField: (tableId: Id, fieldId: Id) => void;
  reorderField: (tableId: Id, fieldId: Id, toIndex: number) => void;

  // relationships
  addRelationship: (rel: Relationship) => void;

  // generic delete (table or relationship)
  deleteEntity: (id: Id) => void;
}

const EMPTY = createDiagram('untitled', 'Untitled diagram', 'postgres');

const mapTables = (d: Diagram, id: Id, fn: (t: Table) => Table): Diagram => ({
  ...d,
  tables: d.tables.map((t) => (t.id === id ? fn(t) : t)),
});

export const useEditorStore = create<EditorState>((set) => ({
  diagram: EMPTY,
  selected: null,
  tool: 'select',

  setSelected: (id) => set({ selected: id }),
  setTool: (t) => set({ tool: t }),

  loadDiagram: (d) => set({ diagram: d, selected: null }),
  renameDiagram: (name) => set((s) => ({ diagram: { ...s.diagram, name } })),

  addTable: (table) => set((s) => ({ diagram: { ...s.diagram, tables: [...s.diagram.tables, table] } })),

  updateTable: (id, patch) => set((s) => ({ diagram: mapTables(s.diagram, id, (t) => ({ ...t, ...patch })) })),

  moveTable: (id, x, y) =>
    set((s) => ({ diagram: mapTables(s.diagram, id, (t) => ({ ...t, position: { x, y } })) })),

  // In M1 identical to moveTable; in M5 this is the one that commits a Yjs transaction.
  commitDrag: (id, x, y) =>
    set((s) => ({ diagram: mapTables(s.diagram, id, (t) => ({ ...t, position: { x, y } })) })),

  addField: (tableId, field) =>
    set((s) => ({ diagram: mapTables(s.diagram, tableId, (t) => ({ ...t, fields: [...t.fields, field] })) })),

  updateField: (tableId, fieldId, patch) =>
    set((s) => ({
      diagram: mapTables(s.diagram, tableId, (t) => ({
        ...t,
        fields: t.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      })),
    })),

  removeField: (tableId, fieldId) =>
    set((s) => ({
      diagram: {
        ...mapTables(s.diagram, tableId, (t) => ({
          ...t,
          fields: t.fields.filter((f) => f.id !== fieldId),
        })),
        relationships: s.diagram.relationships.filter(
          (r) => r.fromFieldId !== fieldId && r.toFieldId !== fieldId,
        ),
      },
    })),

  reorderField: (tableId, fieldId, toIndex) =>
    set((s) => ({
      diagram: mapTables(s.diagram, tableId, (t) => {
        const from = t.fields.findIndex((f) => f.id === fieldId);
        if (from < 0) return t;
        const fields = t.fields.slice();
        const [moved] = fields.splice(from, 1);
        fields.splice(Math.max(0, Math.min(fields.length, toIndex)), 0, moved);
        return { ...t, fields };
      }),
    })),

  addRelationship: (rel) =>
    set((s) => ({ diagram: { ...s.diagram, relationships: [...s.diagram.relationships, rel] } })),

  deleteEntity: (id) =>
    set((s) => {
      const isTable = s.diagram.tables.some((t) => t.id === id);
      if (isTable) {
        return {
          selected: s.selected === id ? null : s.selected,
          diagram: {
            ...s.diagram,
            tables: s.diagram.tables.filter((t) => t.id !== id),
            relationships: s.diagram.relationships.filter(
              (r) => r.fromTableId !== id && r.toTableId !== id,
            ),
          },
        };
      }
      return {
        selected: s.selected === id ? null : s.selected,
        diagram: { ...s.diagram, relationships: s.diagram.relationships.filter((r) => r.id !== id) },
      };
    }),
}));
