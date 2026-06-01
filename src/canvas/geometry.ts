/**
 * Canvas geometry — node dimensions and relationship path math, over the core model.
 */
import type { Cardinality, Relationship, Table } from '@core';

export const NODE_W = 234;
export const STRIP = 7;
/** Base table header height (name row only). */
export const HEAD = 38;
const HEAD_COMMENT = 22;
export const FIELD = 33;
const ROUTE_GAP = 22;
/** Horizontal offset between parallel FK lanes sharing the same table pair + routing side. */
export const LANE_SPACING = 16;

export const fieldIndex = (table: Table, fieldId: string): number =>
  table.fields.findIndex((f) => f.id === fieldId);

export const fieldCenterY = (table: Table, idx: number): number =>
  table.position.y + STRIP + tableHeadHeight(table) + idx * FIELD + FIELD / 2;

export const tableHeadHeight = (table: Table): number =>
  HEAD + (table.comment?.trim() ? HEAD_COMMENT : 0);

export const nodeHeight = (table: Table): number => STRIP + tableHeadHeight(table) + table.fields.length * FIELD;

export interface DiagramBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Camera {
  x: number;
  y: number;
  z: number;
}

/** When zoom is ~100%, snap pan to the device pixel grid for sharper DOM/SVG text. */
const Z_SNAP_EPS = 0.002;

export function snapCamera(cam: Camera, dpr = typeof globalThis !== 'undefined' ? globalThis.devicePixelRatio : 1): Camera {
  if (Math.abs(cam.z - 1) >= Z_SNAP_EPS) return cam;
  const scale = dpr > 0 ? dpr : 1;
  return {
    z: 1,
    x: Math.round(cam.x * scale) / scale,
    y: Math.round(cam.y * scale) / scale,
  };
}

/** Axis-aligned bounds of all table nodes on the canvas. */
export function diagramBounds(tables: Table[]): DiagramBounds | null {
  if (tables.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const t of tables) {
    const h = nodeHeight(t);
    minX = Math.min(minX, t.position.x);
    minY = Math.min(minY, t.position.y);
    maxX = Math.max(maxX, t.position.x + NODE_W);
    maxY = Math.max(maxY, t.position.y + h);
  }
  return { minX, minY, maxX, maxY };
}

function cameraCenteredOn(bounds: DiagramBounds, viewportW: number, viewportH: number, z: number): Camera {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return { x: viewportW / 2 - cx * z, y: viewportH / 2 - cy * z, z };
}

/** Pan/zoom so the full diagram fits inside the viewport (with padding). */
export function cameraFitDiagram(bounds: DiagramBounds, viewportW: number, viewportH: number, padding = 56): Camera {
  const contentW = Math.max(1, bounds.maxX - bounds.minX);
  const contentH = Math.max(1, bounds.maxY - bounds.minY);
  const availW = Math.max(1, viewportW - padding * 2);
  const availH = Math.max(1, viewportH - padding * 2);
  const z = Math.min(2, Math.max(0.3, Math.min(availW / contentW, availH / contentH)));
  return cameraCenteredOn(bounds, viewportW, viewportH, z);
}

/** Center the diagram at 100% zoom (or the given zoom). */
export function cameraCenterDiagram(
  bounds: DiagramBounds,
  viewportW: number,
  viewportH: number,
  z = 1,
): Camera {
  const clamped = Math.min(2, Math.max(0.3, z));
  return snapCamera(cameraCenteredOn(bounds, viewportW, viewportH, clamped));
}

function tableBounds(table: Table): DiagramBounds {
  const h = nodeHeight(table);
  return {
    minX: table.position.x,
    minY: table.position.y,
    maxX: table.position.x + NODE_W,
    maxY: table.position.y + h,
  };
}

/** Center the viewport on one table at the given zoom (keeps current zoom when passed through). */
export function cameraCenterTable(table: Table, viewportW: number, viewportH: number, z: number): Camera {
  const clamped = Math.min(2, Math.max(0.3, z));
  return snapCamera(cameraCenteredOn(tableBounds(table), viewportW, viewportH, clamped));
}

export type RelFocusSide = 'from' | 'to';

export interface RelFocusCycle {
  relId: string;
  next: RelFocusSide;
}

/** Which FK endpoint to pan to on double-click (alternates from ↔ to per relationship). */
export function nextRelationshipFocusSide(
  relId: string,
  prev: RelFocusCycle | null,
): { side: RelFocusSide; next: RelFocusCycle } {
  if (!prev || prev.relId !== relId) {
    return { side: 'from', next: { relId, next: 'to' } };
  }
  const side = prev.next;
  return { side, next: { relId, next: side === 'from' ? 'to' : 'from' } };
}

export interface RelGeometry {
  d: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  labelX: number;
  labelY: number;
  /** Horizontal direction from the anchor into the wire (1 = right, -1 = left). */
  fromHoriz: 1 | -1;
  toHoriz: 1 | -1;
}

/** Orthogonal (Manhattan) route between two field anchors — easier to follow than cubic curves. */
export function wirePath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  childIsLeft: boolean,
  midXOverride?: number,
): RelGeometry {
  const fromHoriz: 1 | -1 = childIsLeft ? -1 : 1;
  const toHoriz: 1 | -1 = childIsLeft ? -1 : 1;
  const x1 = sx + fromHoriz * ROUTE_GAP;
  const x2 = tx + toHoriz * ROUTE_GAP;
  const midX = midXOverride ?? (x1 + x2) / 2;
  const d = `M ${sx} ${sy} L ${x1} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${x2} ${ty} L ${tx} ${ty}`;
  return {
    d,
    sx,
    sy,
    tx,
    ty,
    labelX: midX,
    labelY: (sy + ty) / 2,
    fromHoriz,
    toHoriz,
  };
}

interface RelAnchor {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  childIsLeft: boolean;
}

function relAnchor(rel: Relationship, a: Table, b: Table): RelAnchor | null {
  const ai = fieldIndex(a, rel.fromFieldId);
  const bi = fieldIndex(b, rel.toFieldId);
  if (ai < 0 || bi < 0) return null;
  const sy = fieldCenterY(a, ai);
  const ty = fieldCenterY(b, bi);
  const aCenter = a.position.x + NODE_W / 2;
  const bCenter = b.position.x + NODE_W / 2;
  const childIsLeft = aCenter > bCenter;
  const sx = childIsLeft ? a.position.x : a.position.x + NODE_W;
  const tx = childIsLeft ? b.position.x + NODE_W : b.position.x;
  return { sx, sy, tx, ty, childIsLeft };
}

function bundleKey(fromTableId: string, toTableId: string, childIsLeft: boolean): string {
  return `${fromTableId}\0${toTableId}\0${childIsLeft ? 1 : 0}`;
}

/**
 * Batch layout for all relationships — staggers `midX` per bundle so parallel FKs between the
 * same tables (same routing side) do not stack on one vertical segment.
 */
export function layoutRelationshipPaths(
  rels: Relationship[],
  byId: Record<string, Table>,
): Map<string, RelGeometry | null> {
  const out = new Map<string, RelGeometry | null>();
  const bundles = new Map<string, { rel: Relationship; anchor: RelAnchor }[]>();

  for (const rel of rels) {
    const a = byId[rel.fromTableId];
    const b = byId[rel.toTableId];
    if (!a || !b) {
      out.set(rel.id, null);
      continue;
    }
    const anchor = relAnchor(rel, a, b);
    if (!anchor) {
      out.set(rel.id, null);
      continue;
    }
    const key = bundleKey(rel.fromTableId, rel.toTableId, anchor.childIsLeft);
    const list = bundles.get(key) ?? [];
    list.push({ rel, anchor });
    bundles.set(key, list);
  }

  for (const list of bundles.values()) {
    list.sort((x, y) => x.rel.id.localeCompare(y.rel.id));
    const n = list.length;
    for (let i = 0; i < n; i++) {
      const { rel, anchor } = list[i]!;
      const { sx, sy, tx, ty, childIsLeft } = anchor;
      const fromHoriz: 1 | -1 = childIsLeft ? -1 : 1;
      const toHoriz: 1 | -1 = childIsLeft ? -1 : 1;
      const x1 = sx + fromHoriz * ROUTE_GAP;
      const x2 = tx + toHoriz * ROUTE_GAP;
      const baseMidX = (x1 + x2) / 2;
      const laneOffset = n === 1 ? 0 : (i - (n - 1) / 2) * LANE_SPACING;
      out.set(rel.id, wirePath(sx, sy, tx, ty, childIsLeft, baseMidX + laneOffset));
    }
  }

  return out;
}

/**
 * When several relationship hit paths overlap, advance selection through the stack (top → bottom).
 * Uses `document.elementsFromPoint` — browser only.
 */
export function pickRelationshipAtPoint(
  clickedId: string,
  clientX: number,
  clientY: number,
  selectedRel: string | null,
): string {
  if (typeof document === 'undefined') return clickedId;
  const stack = document
    .elementsFromPoint(clientX, clientY)
    .filter(
      (el): el is SVGPathElement =>
        el instanceof SVGPathElement && el.classList.contains('rel-path-hit'),
    )
    .map((el) => el.getAttribute('data-rel-id'))
    .filter((id): id is string => !!id);
  const unique = [...new Set(stack)];
  if (unique.length <= 1) return clickedId;
  if (!selectedRel || !unique.includes(selectedRel)) return clickedId;
  const idx = unique.indexOf(selectedRel);
  return unique[(idx + 1) % unique.length]!;
}

/** Paint hot/selected edges above overlapping siblings. */
export function orderRelsForPaint(
  rels: Relationship[],
  selectedRel: string | null,
  hotRel: string | null,
): Relationship[] {
  if (!selectedRel && !hotRel) return rels;
  const active = new Set<string>();
  if (selectedRel) active.add(selectedRel);
  if (hotRel) active.add(hotRel);
  const rest: Relationship[] = [];
  const tail: Relationship[] = [];
  for (const r of rels) {
    (active.has(r.id) ? tail : rest).push(r);
  }
  return [...rest, ...tail];
}

/**
 * Path geometry between two explicit table objects. Prefer this over `relPath(rel, byId)` on the
 * hot render path: passing the `Table` objects directly lets the edge components memoize on table
 * identity, so during a drag only the dragged table's incident edges recompute.
 */
export function relPathBetween(
  rel: Relationship,
  a: Table | undefined,
  b: Table | undefined,
): RelGeometry | null {
  if (!a || !b) return null;
  const anchor = relAnchor(rel, a, b);
  if (!anchor) return null;
  const { sx, sy, tx, ty, childIsLeft } = anchor;
  return wirePath(sx, sy, tx, ty, childIsLeft);
}

export function relPath(rel: Relationship, byId: Record<string, Table>): RelGeometry | null {
  return relPathBetween(rel, byId[rel.fromTableId], byId[rel.toTableId]);
}

/** Which end of the relationship is "one" vs "many" for crow's-foot markers. */
export function relEndpointKinds(cardinality: Cardinality): { from: 'one' | 'many'; to: 'one' | 'many' } {
  switch (cardinality) {
    case 'one_to_one':
      return { from: 'one', to: 'one' };
    case 'one_to_many':
      return { from: 'one', to: 'many' };
    case 'many_to_many':
      return { from: 'many', to: 'many' };
    default:
      return { from: 'many', to: 'one' };
  }
}
