/**
 * Typed hooks — the UI's ONLY window into editor state. Components never touch the store
 * internals (or Yjs, in M5) directly. Selectors are granular to keep re-renders surgical.
 */
import { useShallow } from 'zustand/react/shallow';
import type { Diagram, Id, Relationship, Table } from '@core';
import { useEditorStore, type Tool } from './store';

export function useDiagram(): Diagram {
  return useEditorStore((s) => s.diagram);
}

export function useTables(): Table[] {
  return useEditorStore((s) => s.diagram.tables);
}

export function useTable(id: Id | null): Table | undefined {
  return useEditorStore((s) => (id ? s.diagram.tables.find((t) => t.id === id) : undefined));
}

export function useRelationships(): Relationship[] {
  return useEditorStore((s) => s.diagram.relationships);
}

export function useDiagramMeta(): { name: string; dialect: Diagram['dialect'] } {
  return useEditorStore(useShallow((s) => ({ name: s.diagram.name, dialect: s.diagram.dialect })));
}

export function useSelection(): [Id | null, (id: Id | null) => void] {
  const selected = useEditorStore((s) => s.selected);
  const setSelected = useEditorStore((s) => s.setSelected);
  return [selected, setSelected];
}

export function useTool(): [Tool, (t: Tool) => void] {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  return [tool, setTool];
}

/** Write actions (stable references). */
export function useEditorActions() {
  return useEditorStore(
    useShallow((s) => ({
      loadDiagram: s.loadDiagram,
      renameDiagram: s.renameDiagram,
      addTable: s.addTable,
      updateTable: s.updateTable,
      moveTable: s.moveTable,
      commitDrag: s.commitDrag,
      addField: s.addField,
      updateField: s.updateField,
      removeField: s.removeField,
      reorderField: s.reorderField,
      addRelationship: s.addRelationship,
      deleteEntity: s.deleteEntity,
    })),
  );
}
