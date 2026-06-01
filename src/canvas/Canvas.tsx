/**
 * Canvas — the interactive editor surface: pan/zoom, table drag, FK-grip linking, relationships,
 * comment pins, live cursors, floating dock + zoom pill. Reads/writes diagram state through
 * @store hooks. All collaboration is real (Yjs Awareness): you're solo until you Share, then
 * teammates' cursors/locks appear — no mock teammates.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type WheelEvent,
} from 'react';
import { createRelationship, createField, createTable, newId } from '@core';
import {
  useCanvasPresence,
  useComments,
  useEditorActions,
  usePresence,
  useRelationships,
  useSelection,
  useTables,
  useTool,
  useUndoRedo,
} from '@store';
import { Icon, type IconName } from '@ui/Icon';
import { Btn } from '@ui/atoms';
import { CommentPins } from './CommentPins';
import { RemoteCursorsLayer } from './RemoteCursorsLayer';
import { RelationshipLayer, type LinkingState } from './RelationshipLayer';
import { TableNode, type LockUser } from './TableNode';
import type { Tool } from '@store';

interface CanvasProps {
  draft: { x: number; y: number } | null;
  grid?: boolean;
  pins?: boolean;
  onPlaceComment: (x: number, y: number) => void;
  onOpenComment: (id: string) => void;
}

interface Camera {
  x: number;
  y: number;
  z: number;
}

type DragState =
  | { mode: 'node'; id: string; sx: number; sy: number; ox: number; oy: number; lastX: number; lastY: number }
  | { mode: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { mode: 'link'; fromT: string; fromF: string }
  | null;

export function Canvas({ draft, grid = true, pins = true, onPlaceComment, onOpenComment }: CanvasProps) {
  const tables = useTables();
  const rels = useRelationships();
  const comments = useComments();
  const [selected, setSelected] = useSelection();
  const [tool, setTool] = useTool();
  const actions = useEditorActions();
  const { undo, redo } = useUndoRedo();
  const presence = useCanvasPresence();
  const live = usePresence();

  const wrapRef = useRef<HTMLDivElement>(null);
  const lastCursorSent = useRef(0);

  // Advisory lock for a table — comes from real teammate presence (empty when solo).
  const lockFor = (tableId: string): LockUser | undefined => presence.locks[tableId];
  const [cam, setCam] = useState<Camera>({ x: 60, y: 30, z: 0.92 });
  const drag = useRef<DragState>(null);
  const [hotRel, setHotRel] = useState<string | null>(null);
  const [linking, setLinking] = useState<LinkingState | null>(null);

  const byId = useMemo(() => Object.fromEntries(tables.map((t) => [t.id, t])), [tables]);
  const fkFieldIds = useMemo(() => new Set(rels.map((r) => r.fromFieldId)), [rels]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const r = wrapRef.current!.getBoundingClientRect();
      return { x: (clientX - r.left - cam.x) / cam.z, y: (clientY - r.top - cam.y) / cam.z };
    },
    [cam],
  );

  const onNodeDragStart = (e: MouseEvent, id: string) => {
    const t = byId[id];
    drag.current = { mode: 'node', id, sx: e.clientX, sy: e.clientY, ox: t.position.x, oy: t.position.y, lastX: t.position.x, lastY: t.position.y };
  };

  const onBgDown = (e: MouseEvent) => {
    if (tool === 'comment') {
      const p = toCanvas(e.clientX, e.clientY);
      onPlaceComment(Math.round(p.x), Math.round(p.y));
      setTool('select');
      return;
    }
    setSelected(null);
    drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: cam.x, oy: cam.y };
  };

  const onGrip = (e: MouseEvent, tId: string, fId: string) => {
    const p = toCanvas(e.clientX, e.clientY);
    drag.current = { mode: 'link', fromT: tId, fromF: fId };
    setLinking({ fromT: tId, fromF: fId, x: p.x, y: p.y });
  };

  useEffect(() => {
    const move = (e: globalThis.MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d.mode === 'node') {
        const nx = d.ox + (e.clientX - d.sx) / cam.z;
        const ny = d.oy + (e.clientY - d.sy) / cam.z;
        d.lastX = nx;
        d.lastY = ny;
        actions.moveTable(d.id, nx, ny);
      } else if (d.mode === 'pan') {
        setCam((c) => ({ ...c, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }));
      } else if (d.mode === 'link') {
        const p = toCanvas(e.clientX, e.clientY);
        setLinking((l) => (l ? { ...l, x: p.x, y: p.y } : l));
      }
    };
    const up = (e: globalThis.MouseEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if (d.mode === 'node') {
        actions.commitDrag(d.id, d.lastX, d.lastY);
      } else if (d.mode === 'link') {
        // Complete the relationship if released over another table's field row.
        const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
          '[data-fid]',
        ) as HTMLElement | null;
        const tid = target?.dataset.tid;
        const fid = target?.dataset.fid;
        if (tid && fid && tid !== d.fromT) {
          actions.addRelationship(
            createRelationship(newId(), { tableId: d.fromT, fieldId: d.fromF }, { tableId: tid, fieldId: fid }, {
              cardinality: 'many_to_one',
            }),
          );
        }
        setLinking(null);
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [cam.z, toCanvas, actions]);

  // Delete selected entity with Delete/Backspace (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        actions.deleteEntity(selected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, actions]);

  // Broadcast the selected table as presence → others see an advisory "editing" lock on it.
  useEffect(() => {
    if (!presence.isShared) return;
    live.setSelection(selected ? [selected] : []);
    live.setActivity(selected ? { type: 'editing', tableId: selected } : { type: 'idle' });
  }, [selected, presence.isShared, live]);

  // Throttled cursor broadcast (canvas coords) while sharing.
  const onPointerMove = (e: MouseEvent) => {
    if (!presence.isShared) return;
    const now = performance.now();
    if (now - lastCursorSent.current < 40) return;
    lastCursorSent.current = now;
    live.setCursor(toCanvas(e.clientX, e.clientY));
  };
  const onPointerLeave = () => {
    if (presence.isShared) live.setCursor(null);
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const r = wrapRef.current!.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setCam((c) => {
        const nz = Math.min(2, Math.max(0.3, c.z * (1 - e.deltaY * 0.0016)));
        const k = nz / c.z;
        return { z: nz, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
      });
    } else {
      setCam((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
    }
  };

  const zoomBy = (f: number) =>
    setCam((c) => {
      const r = wrapRef.current!.getBoundingClientRect();
      const mx = r.width / 2;
      const my = r.height / 2;
      const nz = Math.min(2, Math.max(0.3, c.z * f));
      const k = nz / c.z;
      return { z: nz, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
    });
  const fitView = () => setCam({ x: 60, y: 30, z: 0.92 });

  const addTableAtCenter = useCallback(() => {
    const r = wrapRef.current!.getBoundingClientRect();
    const p = toCanvas(r.left + r.width / 2, r.top + r.height / 2);
    const id = newId();
    actions.addTable(
      createTable(id, 'new_table', {
        color: '#6366f1',
        position: { x: Math.round(p.x - 117), y: Math.round(p.y - 40) },
        fields: [createField(newId(), 'id', 'int4', { primary: true, autoIncrement: true })],
      }),
    );
    setSelected(id);
  }, [toCanvas, actions, setSelected]);

  // Keyboard shortcuts: tools (V/H/C/T) and undo/redo (mod+Z / mod+shift+Z / mod+Y).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod) return;
      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 'h':
          setTool('pan');
          break;
        case 'c':
          setTool('comment');
          break;
        case 't':
          addTableAtCenter();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setTool, addTableAtCenter]);

  const primaryTools: [IconName, Tool, string][] = [
    ['cursor', 'select', 'Select / move  V'],
    ['hand', 'pan', 'Pan  H'],
  ];

  return (
    <div
      className="canvas-wrap"
      ref={wrapRef}
      onWheel={onWheel}
      onMouseMove={onPointerMove}
      onMouseLeave={onPointerLeave}
      style={{ cursor: tool === 'comment' ? 'crosshair' : 'default' }}
    >
      {grid && <div className="canvas-grid" />}
      <div style={{ position: 'absolute', inset: 0 }} onMouseDown={onBgDown} />

      <div className="canvas" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}>
        <RelationshipLayer rels={rels} byId={byId} hotRel={hotRel} onHot={setHotRel} linking={linking} />

        {tables.map((t) => (
          <TableNode
            key={t.id}
            table={t}
            fkFieldIds={fkFieldIds}
            selected={selected === t.id}
            lockedBy={lockFor(t.id)}
            onSelect={setSelected}
            onDragStart={onNodeDragStart}
            onGrip={onGrip}
          />
        ))}

        {pins && <CommentPins comments={comments} draft={draft} onOpen={onOpenComment} />}

        <RemoteCursorsLayer />
      </div>

      <div className="canvas-hint">
        <span className="chip">
          <Icon name="users" size={13} />
          {presence.peers + 1} {presence.peers === 0 ? '· just you' : 'here now'}
        </span>
      </div>

      <div className="dock">
        {primaryTools.map(([ic, id, tip]) => (
          <button
            key={id}
            className={'tool' + (tool === id ? ' active' : '')}
            data-tip={tip}
            title={tip}
            onClick={() => setTool(id)}
          >
            <Icon name={ic} size={18} />
          </button>
        ))}
        <div className="dock__sep" />
        <button className="tool" data-tip="Add table  T" title="Add table" onClick={addTableAtCenter}>
          <Icon name="table" size={18} />
        </button>
        <button
          className={'tool' + (tool === 'comment' ? ' active' : '')}
          data-tip="Comment  C"
          title="Comment"
          onClick={() => setTool(tool === 'comment' ? 'select' : 'comment')}
        >
          <Icon name="comment" size={18} />
        </button>
        <div className="dock__sep" />
        <button className="tool" data-tip="Generate with AI" title="AI" style={{ color: 'var(--accent-strong)' }}>
          <Icon name="sparkle" size={18} />
        </button>
      </div>

      <div className="zoom">
        <Btn iconOnly sm variant="ghost" icon="minus" onClick={() => zoomBy(0.85)} />
        <div className="zoom__val">{Math.round(cam.z * 100)}%</div>
        <Btn iconOnly sm variant="ghost" icon="plus" onClick={() => zoomBy(1.15)} />
        <div className="dock__sep" />
        <Btn iconOnly sm variant="ghost" icon="fit" title="Fit" onClick={fitView} />
      </div>
    </div>
  );
}
