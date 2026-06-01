/**
 * Typed hooks — the UI's ONLY window into editor state. Components never touch the store
 * internals (or Yjs, in M5) directly. Selectors are granular to keep re-renders surgical.
 */
import { useShallow } from 'zustand/react/shallow';
import type { Diagram, Id, Relationship, Table } from '@core';
import {
  diffVersion,
  listVersions,
  type Activity,
  type ActivityEntry,
  type Comment,
  type ConnectionState,
  type DiffTag,
  type PresenceUser,
  type RemotePresence,
  type VersionMeta,
} from '@collab';
import { useEditorStore, type Tool } from './store';

export function useIdentity(): PresenceUser {
  return useEditorStore((s) => s.identity);
}

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

export function useConnection(): { connection: ConnectionState; shareRoom: () => string; leaveRoom: () => void } {
  return useEditorStore(
    useShallow((s) => ({ connection: s.connection, shareRoom: s.shareRoom, leaveRoom: s.leaveRoom })),
  );
}

export function useOthers(): RemotePresence[] {
  return useEditorStore((s) => s.others);
}

export function usePresence(): {
  setCursor: (p: { x: number; y: number } | null) => void;
  setSelection: (ids: string[]) => void;
  setActivity: (a: Activity) => void;
} {
  return useEditorStore(
    useShallow((s) => ({ setCursor: s.setCursor, setSelection: s.setSelectionPresence, setActivity: s.setActivity })),
  );
}

export function useUndoRedo(): { undo: () => void; redo: () => void } {
  return useEditorStore(useShallow((s) => ({ undo: s.undo, redo: s.redo })));
}

export interface RemoteCursorView {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
}

/** Remote cursors (canvas coords). Isolated from useCanvasPresence so high-frequency cursor
 *  updates only re-render the cursor layer, not the whole canvas. */
export function useRemoteCursors(): RemoteCursorView[] {
  return useEditorStore(
    useShallow((s) =>
      s.others
        .filter((o) => o.cursor)
        .map((o) => ({ id: o.clientId, name: o.user.name, color: o.user.color, x: o.cursor!.x, y: o.cursor!.y })),
    ),
  );
}

export interface CanvasPresence {
  isShared: boolean;
  peers: number;
  /** tableId → the presence user currently editing it (advisory lock). */
  locks: Record<string, { name: string; color: string }>;
}

export function useComments(): Comment[] {
  return useEditorStore((s) => s.comments);
}

export function useActivity(): ActivityEntry[] {
  return useEditorStore((s) => s.activity);
}

export function useCommentActions(): {
  addComment: (input: { x: number; y: number; tableId: string | null; body: string }) => void;
  resolveComment: (id: string) => void;
  addReply: (id: string, body: string) => void;
} {
  return useEditorStore(
    useShallow((s) => ({ addComment: s.addComment, resolveComment: s.resolveComment, addReply: s.addReply })),
  );
}

export function useVersions(): {
  list: () => VersionMeta[];
  diff: (versionId: string) => DiffTag[];
  save: (label: string) => VersionMeta | null;
  restore: (versionId: string) => void;
} {
  const diagramId = useEditorStore((s) => s.diagram.id);
  const save = useEditorStore((s) => s.saveVersion);
  const restore = useEditorStore((s) => s.restoreVersion);
  return {
    list: () => listVersions(diagramId),
    diff: (versionId) => diffVersion(diagramId, versionId, useEditorStore.getState().diagram),
    save,
    restore,
  };
}

export function useCanvasPresence(): CanvasPresence {
  return useEditorStore(
    useShallow((s) => {
      const locks: Record<string, { name: string; color: string }> = {};
      for (const o of s.others) {
        if (o.activity.type === 'editing' || o.activity.type === 'dragging') {
          locks[o.activity.tableId] = { name: o.user.name, color: o.user.color };
        }
      }
      return { isShared: s.connection.isShared, peers: s.others.length, locks };
    }),
  );
}
