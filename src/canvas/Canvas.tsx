/**
 * Canvas — the interactive editor surface: pan/zoom, table drag, FK-grip linking, relationships,
 * comment pins, live cursors, floating dock + zoom pill. Reads/writes diagram state through
 * @store hooks. All collaboration is real (Yjs Awareness): you're solo until you Share, then
 * teammates' cursors/locks appear — no mock teammates.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { createRelationship, createField, createTable, newId } from '@core';
import {
  useCanvasPresence,
  useComments,
  useEditorActions,
  useEditorStore,
  usePresence,
  useRelationships,
  useSelectedRel,
  useSelection,
  useTables,
  useReadonly,
  useTool,
  useUndoRedo,
} from '@store';
import { Icon, type IconName } from '@ui/Icon';
import { Btn } from '@ui/atoms';
import { CommentPins } from './CommentPins';
import { RemoteCursorsLayer } from './RemoteCursorsLayer';
import { RelationshipContextMenu } from './RelationshipContextMenu';
import { RelationshipHitLayer, RelationshipLayer, type LinkingState } from './RelationshipLayer';
import {
  cameraCenterDiagram,
  cameraCenterTable,
  cameraFitDiagram,
  diagramBounds,
  nodeHeight,
  NODE_W,
  snapCamera,
  type Camera,
  type DiagramBounds,
} from './geometry';
import { CanvasFind } from './CanvasFind';
import { TableNode, type LockUser } from './TableNode';
import type { Tool } from '@store';

interface CanvasProps {
  draft: { x: number; y: number } | null;
  grid?: boolean;
  pins?: boolean;
  onPlaceComment: (x: number, y: number) => void;
  onOpenComment: (id: string) => void;
  onAiClick?: () => void;
}

type DragState =
  | { mode: 'node'; id: string; sx: number; sy: number; ox: number; oy: number; lastX: number; lastY: number }
  | { mode: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { mode: 'link'; fromT: string; fromF: string }
  | null;

/** At/above this table count, render only the nodes + edges intersecting the viewport (culling). */
const VIRTUALIZE_THRESHOLD = 60;
/** Below this zoom, collapse field rows to a placeholder (level-of-detail) — see TableNode. */
const LOD_ZOOM = 0.45;
/** Canvas-space padding around the viewport so nodes pre-render just before scrolling into view. */
const CULL_MARGIN = 400;

export function Canvas({
  draft,
  grid = true,
  pins = true,
  onPlaceComment,
  onOpenComment,
  onAiClick,
}: CanvasProps) {
  const tables = useTables();
  const rels = useRelationships();
  const comments = useComments();
  const [selected, setSelected] = useSelection();
  const [selectedRel, setSelectedRel] = useSelectedRel();
  const [tool, setTool] = useTool();
  const actions = useEditorActions();
  const { undo, redo } = useUndoRedo();
  const readonly = useReadonly();
  const presence = useCanvasPresence();
  const live = usePresence();

  const wrapRef = useRef<HTMLDivElement>(null);
  const lastCursorSent = useRef(0);

  // Advisory lock for a table — comes from real teammate presence (empty when solo).
  const lockFor = (tableId: string): LockUser | undefined => presence.locks[tableId];
  const [cam, setCam] = useState<Camera>(() => snapCamera({ x: 60, y: 30, z: 1 }));
  // Live mirror of `cam` so pan/drag handlers and `toCanvas` read the current camera WITHOUT
  // depending on `cam` — keeps those callbacks referentially stable so memoized TableNodes/edges
  // can skip re-rendering each pan frame. Every camera write goes through `applyCam`, which keeps
  // the ref and React state in lockstep.
  const camRef = useRef(cam);
  const applyCam = useCallback((next: Camera | ((c: Camera) => Camera)) => {
    setCam((c) => {
      const resolved = typeof next === 'function' ? next(c) : next;
      const snapped = snapCamera(resolved);
      camRef.current = snapped;
      return snapped;
    });
  }, []);
  const drag = useRef<DragState>(null);
  const dragPreviewRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const dragPaintRaf = useRef(0);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hotRel, setHotRel] = useState<string | null>(null);
  const [linking, setLinking] = useState<LinkingState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isViewportMoving, setIsViewportMoving] = useState(false);
  const viewportMovingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const markViewportMoving = useCallback(() => {
    setIsViewportMoving(true);
    clearTimeout(viewportMovingTimer.current);
    viewportMovingTimer.current = setTimeout(() => setIsViewportMoving(false), 150);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(viewportMovingTimer.current);
    },
    [],
  );

  const [relMenu, setRelMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState({ w: 1600, h: 900 });

  // Track the viewport size (canvas-coord culling math needs it). Measured before paint, kept fresh.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // PERF INVARIANT: `byId` reuses the original Table object refs, and `layoutById` overrides
  // EXACTLY one key (the dragged table) during a drag — everything else keeps its identity. This
  // is what lets memoized TableNodes and per-edge graphics skip: a pan re-renders Canvas but leaves
  // every node/edge prop referentially equal, and a drag only touches the dragged node + its
  // incident edges. Do NOT map `{...t}` over all tables here, or memoization silently breaks.
  const byId = useMemo(() => Object.fromEntries(tables.map((t) => [t.id, t])), [tables]);
  const layoutById = useMemo(() => {
    if (!dragPreview) return byId;
    const t = byId[dragPreview.id];
    if (!t) return byId;
    return { ...byId, [dragPreview.id]: { ...t, position: { x: dragPreview.x, y: dragPreview.y } } };
  }, [byId, dragPreview]);

  const scheduleDragPaint = useCallback(() => {
    if (dragPaintRaf.current) return;
    dragPaintRaf.current = requestAnimationFrame(() => {
      dragPaintRaf.current = 0;
      setDragPreview(dragPreviewRef.current ? { ...dragPreviewRef.current } : null);
    });
  }, []);

  const clearDragPaint = useCallback(() => {
    if (dragPaintRaf.current) cancelAnimationFrame(dragPaintRaf.current);
    dragPaintRaf.current = 0;
    dragPreviewRef.current = null;
    setDragPreview(null);
  }, []);
  const fkFieldIds = useMemo(() => new Set(rels.map((r) => r.fromFieldId)), [rels]);

  // Virtualization: on big diagrams render only what intersects the viewport, and collapse field
  // rows when zoomed far out. Small diagrams render everything (culling would cost more than it saves
  // and would defeat the per-pan layer-skip optimization). The visible rect is in canvas coords.
  const culling = tables.length >= VIRTUALIZE_THRESHOLD;
  const compact = cam.z < LOD_ZOOM;
  const viewRect = useMemo<DiagramBounds>(
    () => ({
      minX: -cam.x / cam.z - CULL_MARGIN,
      minY: -cam.y / cam.z - CULL_MARGIN,
      maxX: (viewport.w - cam.x) / cam.z + CULL_MARGIN,
      maxY: (viewport.h - cam.y) / cam.z + CULL_MARGIN,
    }),
    [cam, viewport],
  );
  const visibleTables = useMemo(() => {
    if (!culling) return tables;
    // Always keep the selected / dragged / linking-source table mounted even if off-screen.
    const forced = new Set<string>();
    if (selected) forced.add(selected);
    if (dragPreview) forced.add(dragPreview.id);
    if (linking) forced.add(linking.fromT);
    return tables.filter(
      (t) =>
        forced.has(t.id) ||
        (t.position.x <= viewRect.maxX &&
          t.position.x + NODE_W >= viewRect.minX &&
          t.position.y <= viewRect.maxY &&
          t.position.y + nodeHeight(t) >= viewRect.minY),
    );
  }, [culling, tables, viewRect, selected, dragPreview, linking]);
  const cullRect = culling ? viewRect : null;

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    const c = camRef.current;
    return { x: (clientX - r.left - c.x) / c.z, y: (clientY - r.top - c.y) / c.z };
  }, []);

  const onNodeDragStart = useCallback(
    (e: MouseEvent, id: string) => {
      if (readonly) return;
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      const t = useEditorStore.getState().diagram.tables.find((tb) => tb.id === id);
      if (!t) return;
      drag.current = {
        mode: 'node',
        id,
        sx: e.clientX,
        sy: e.clientY,
        ox: t.position.x,
        oy: t.position.y,
        lastX: t.position.x,
        lastY: t.position.y,
      };
    },
    [readonly],
  );

  const startPanDrag = (e: MouseEvent) => {
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: camRef.current.x, oy: camRef.current.y };
    setIsPanning(true);
  };

  const onWrapMouseDownCapture = (e: MouseEvent) => {
    if (e.button === 1) {
      startPanDrag(e);
      return;
    }
    if (e.button === 0 && tool === 'pan') {
      startPanDrag(e);
      e.stopPropagation();
    }
  };

  const onRelContextMenu = useCallback(
    (relId: string, clientX: number, clientY: number) => {
      if (readonly) return;
      setRelMenu({ id: relId, x: clientX, y: clientY });
      setSelectedRel(relId);
    },
    [readonly, setSelectedRel],
  );

  const onBgDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setRelMenu(null);
    if (!readonly && tool === 'comment') {
      const p = toCanvas(e.clientX, e.clientY);
      onPlaceComment(Math.round(p.x), Math.round(p.y));
      setTool('select');
      return;
    }
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    setSelected(null);
    setSelectedRel(null);
    startPanDrag(e);
  };

  const onCanvasMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || tool === 'pan') return;
    const el = e.target as HTMLElement;
    if (el.closest('.node__grip, .rel-path-hit, .pin')) return;
    onBgDown(e);
  };

  const onGrip = useCallback(
    (e: MouseEvent, tId: string, fId: string) => {
      if (readonly) return;
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      const p = toCanvas(e.clientX, e.clientY);
      drag.current = { mode: 'link', fromT: tId, fromF: fId };
      setLinking({ fromT: tId, fromF: fId, x: p.x, y: p.y });
    },
    [readonly, toCanvas],
  );

  useEffect(() => {
    const blockSelect = (e: Event) => {
      if (drag.current) e.preventDefault();
    };
    const move = (e: globalThis.MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d.mode === 'node') {
        const z = camRef.current.z;
        const nx = d.ox + (e.clientX - d.sx) / z;
        const ny = d.oy + (e.clientY - d.sy) / z;
        d.lastX = nx;
        d.lastY = ny;
        dragPreviewRef.current = { id: d.id, x: nx, y: ny };
        scheduleDragPaint();
      } else if (d.mode === 'pan') {
        markViewportMoving();
        applyCam((c) => ({ ...c, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }));
      } else if (d.mode === 'link') {
        const p = toCanvas(e.clientX, e.clientY);
        setLinking((l) => (l ? { ...l, x: p.x, y: p.y } : l));
      }
    };
    const up = (e: globalThis.MouseEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if (d.mode === 'pan') setIsPanning(false);
      if (d.mode === 'node') {
        clearDragPaint();
        actions.commitDrag(d.id, d.lastX, d.lastY);
      } else if (d.mode === 'link') {
        // Complete the relationship if released over another table's field row.
        const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
          '[data-fid]',
        ) as HTMLElement | null;
        const tid = target?.dataset.tid;
        const fid = target?.dataset.fid;
        if (tid && fid && tid !== d.fromT) {
          const id = newId();
          actions.addRelationship(
            createRelationship(id, { tableId: d.fromT, fieldId: d.fromF }, { tableId: tid, fieldId: fid }, {
              cardinality: 'many_to_one',
            }),
          );
        }
        setLinking(null);
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    document.addEventListener('selectstart', blockSelect);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.removeEventListener('selectstart', blockSelect);
      if (dragPaintRaf.current) cancelAnimationFrame(dragPaintRaf.current);
    };
  }, [toCanvas, actions, scheduleDragPaint, clearDragPaint, applyCam, markViewportMoving]);

  // Delete selected entity with Delete/Backspace (unless typing in a field).
  useEffect(() => {
    if (readonly) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedRel) {
          e.preventDefault();
          actions.deleteEntity(selectedRel);
        } else if (selected) {
          e.preventDefault();
          actions.deleteEntity(selected);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readonly, selected, selectedRel, actions]);

  // Broadcast the selected table as presence → others see an advisory "editing" lock on it.
  useEffect(() => {
    if (readonly || !presence.isLive) return;
    live.setSelection(selected ? [selected] : []);
    live.setActivity(selected ? { type: 'editing', tableId: selected } : { type: 'idle' });
  }, [readonly, selected, presence.isLive, live]);

  // Throttled cursor broadcast (canvas coords) while sharing.
  const onPointerMove = (e: MouseEvent) => {
    if (!presence.isLive) return;
    const now = performance.now();
    if (now - lastCursorSent.current < 40) return;
    lastCursorSent.current = now;
    live.setCursor(toCanvas(e.clientX, e.clientY));
  };
  const onPointerLeave = () => {
    if (presence.isLive) live.setCursor(null);
  };

  // Wheel: trackpad / Magic Mouse pan & pinch-zoom (needs passive:false — see effect below).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const wheelScale = (e: WheelEvent): number => {
      if (e.deltaMode === 1) return 32; // DOM_DELTA_LINE — common on mice
      if (e.deltaMode === 2) return 480; // DOM_DELTA_PAGE
      return 1; // DOM_DELTA_PIXEL — trackpads, Magic Mouse
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      markViewportMoving();
      const scale = wheelScale(e);
      let dx = e.deltaX * scale;
      let dy = e.deltaY * scale;

      // Shift+vertical wheel → horizontal pan (Windows / some mice).
      if (e.shiftKey && dx === 0 && dy !== 0) {
        dx = dy;
        dy = 0;
      }

      // Ctrl / ⌘ + scroll wheel → zoom at cursor (trackpad pinch also sets ctrlKey on macOS).
      const zoomGesture = e.ctrlKey || e.metaKey;
      if (zoomGesture) {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
        applyCam((c) => {
          const nz = Math.min(2, Math.max(0.3, c.z * (1 - delta * 0.0016)));
          const k = nz / c.z;
          return { z: nz, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
        });
      } else {
        applyCam((c) => ({ ...c, x: c.x - dx, y: c.y - dy }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyCam, markViewportMoving]);

  const zoomBy = (f: number) => {
    markViewportMoving();
    applyCam((c) => {
      const r = wrapRef.current!.getBoundingClientRect();
      const mx = r.width / 2;
      const my = r.height / 2;
      const nz = Math.min(2, Math.max(0.3, c.z * f));
      const k = nz / c.z;
      return { z: nz, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
    });
  };

  const viewportCam = useCallback((z?: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return null;
    const bounds = diagramBounds(tables);
    if (!bounds) return { x: r.width / 2, y: r.height / 2, z: z ?? 1 };
    if (z != null) return cameraCenterDiagram(bounds, r.width, r.height, z);
    return cameraFitDiagram(bounds, r.width, r.height);
  }, [tables]);

  const fitView = useCallback(() => {
    const next = viewportCam();
    if (next) applyCam(next);
  }, [viewportCam, applyCam]);

  const resetView = useCallback(() => {
    const next = viewportCam(1);
    if (next) applyCam(next);
  }, [viewportCam, applyCam]);

  const focusTable = useCallback(
    (tableId: string) => {
      const t = tables.find((tb) => tb.id === tableId);
      if (!t) return;
      setSelected(tableId);
      setSelectedRel(null);
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      applyCam(cameraCenterTable(t, r.width, r.height, camRef.current.z));
    },
    [tables, setSelected, setSelectedRel, applyCam],
  );

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
      if (!readonly && mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!readonly && mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod) return;
      switch (e.key.toLowerCase()) {
        case 'v':
          if (!readonly) setTool('select');
          break;
        case 'h':
          setTool('pan');
          break;
        case 'c':
          if (!readonly) setTool('comment');
          break;
        case 't':
          if (!readonly) addTableAtCenter();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readonly, undo, redo, setTool, addTableAtCenter]);

  const primaryTools: [IconName, Tool, string][] = [
    ['cursor', 'select', 'Select / move  V'],
    ['hand', 'pan', 'Pan  H'],
  ];

  const cursor =
    isPanning || tool === 'pan'
      ? isPanning
        ? 'grabbing'
        : 'grab'
      : !readonly && tool === 'comment'
        ? 'crosshair'
        : 'default';

  return (
    <div
      className="canvas-wrap"
      ref={wrapRef}
      onMouseDownCapture={onWrapMouseDownCapture}
      onAuxClick={(e) => e.button === 1 && e.preventDefault()}
      onMouseMove={onPointerMove}
      onMouseLeave={onPointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor }}
    >
      {grid && <div className="canvas-grid" />}

      <div
        className={'canvas' + (isPanning || isViewportMoving ? ' canvas--moving' : '')}
        style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}
        onMouseDown={onCanvasMouseDown}
      >
        <RelationshipLayer
          rels={rels}
          byId={layoutById}
          selectedRel={selectedRel}
          hotRel={hotRel}
          linking={linking}
          viewRect={cullRect}
        />

        {visibleTables.map((t) => {
          const preview = dragPreview?.id === t.id ? dragPreview : null;
          return (
            <TableNode
              key={t.id}
              table={t}
              position={preview ?? t.position}
              dragging={!!preview}
              compact={compact}
              fkFieldIds={fkFieldIds}
              selected={selected === t.id}
              lockedBy={lockFor(t.id)}
              onSelect={setSelected}
              onDragStart={onNodeDragStart}
              onGrip={readonly ? undefined : onGrip}
              readonly={readonly}
            />
          );
        })}

        <RelationshipHitLayer
          rels={rels}
          byId={layoutById}
          selectedRel={selectedRel}
          hotRel={hotRel}
          linking={linking}
          viewRect={cullRect}
          onHot={setHotRel}
          onSelectRel={setSelectedRel}
          onContextMenuRel={onRelContextMenu}
        />

        {pins && <CommentPins comments={comments} draft={draft} onOpen={onOpenComment} />}

        <RemoteCursorsLayer />
      </div>

      <div className="canvas-hint">
        <span className="chip">
          <Icon name="users" size={13} />
          {presence.peers + 1} {presence.peers === 0 ? '· just you' : 'here now'}
        </span>
        <span className="chip" style={{ marginLeft: 8 }}>
          Ctrl / ⌘ + scroll to zoom
        </span>
      </div>

      <CanvasFind tables={tables} onPick={focusTable} />

      {relMenu && (
        <RelationshipContextMenu relId={relMenu.id} x={relMenu.x} y={relMenu.y} onClose={() => setRelMenu(null)} />
      )}

      <div className="dock">
        {(readonly
          ? ([['hand', 'pan', 'Pan  H']] as [IconName, Tool, string][])
          : primaryTools
        ).map(([ic, id, tip]) => (
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
        {!readonly && (
          <>
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
            <button
              className="tool"
              data-tip="Generate with AI"
              title="Generate with AI"
              style={{ color: 'var(--accent-strong)' }}
              onClick={() => onAiClick?.()}
            >
              <Icon name="sparkle" size={18} />
            </button>
          </>
        )}
      </div>

      <div className="zoom">
        <Btn iconOnly sm variant="ghost" icon="minus" onClick={() => zoomBy(0.85)} />
        <div className="zoom__val">{Math.round(cam.z * 100)}%</div>
        <Btn iconOnly sm variant="ghost" icon="plus" onClick={() => zoomBy(1.15)} />
        <div className="dock__sep" />
        <Btn iconOnly sm variant="ghost" icon="fit" title="Fit diagram in view" onClick={fitView} />
        <Btn iconOnly sm variant="ghost" icon="focus" title="Reset zoom (100%) and center diagram" onClick={resetView} />
      </div>
    </div>
  );
}
