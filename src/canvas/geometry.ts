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
  return cameraCenteredOn(bounds, viewportW, viewportH, clamped);
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
export function wirePath(sx: number, sy: number, tx: number, ty: number, childIsLeft: boolean): RelGeometry {
  const fromHoriz: 1 | -1 = childIsLeft ? -1 : 1;
  const toHoriz: 1 | -1 = childIsLeft ? -1 : 1;
  const x1 = sx + fromHoriz * ROUTE_GAP;
  const x2 = tx + toHoriz * ROUTE_GAP;
  const midX = (x1 + x2) / 2;
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
