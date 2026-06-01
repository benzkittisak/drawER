/**
 * Canvas geometry — node dimensions and relationship path math, over the core model.
 * Constants come from the design (docs/design-reference/editor-canvas.jsx).
 */
import type { Relationship, Table } from '@core';

export const NODE_W = 234;
export const STRIP = 7;
export const HEAD = 38;
export const FIELD = 33;

export const fieldIndex = (table: Table, fieldId: string): number =>
  table.fields.findIndex((f) => f.id === fieldId);

export const fieldCenterY = (table: Table, idx: number): number =>
  table.position.y + STRIP + HEAD + idx * FIELD + FIELD / 2;

export const nodeHeight = (table: Table): number => STRIP + HEAD + table.fields.length * FIELD;

export interface RelGeometry {
  d: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  mx: number;
  my: number;
}

/** Cubic-bezier path from one field row to another, exiting the nearest side of each node. */
export function relPath(rel: Relationship, byId: Record<string, Table>): RelGeometry | null {
  const a = byId[rel.fromTableId];
  const b = byId[rel.toTableId];
  if (!a || !b) return null;
  const ai = fieldIndex(a, rel.fromFieldId);
  const bi = fieldIndex(b, rel.toFieldId);
  if (ai < 0 || bi < 0) return null;

  const ay = fieldCenterY(a, ai);
  const by = fieldCenterY(b, bi);
  const aCenter = a.position.x + NODE_W / 2;
  const bCenter = b.position.x + NODE_W / 2;
  const aRight = aCenter < bCenter;
  const sx = aRight ? a.position.x + NODE_W : a.position.x;
  const tx = aRight ? b.position.x : b.position.x + NODE_W;
  const dx = Math.max(46, Math.abs(tx - sx) / 2);
  const c1 = sx + (aRight ? dx : -dx);
  const c2 = tx + (aRight ? -dx : dx);
  const mx = (sx + tx) / 2;
  const my = (ay + by) / 2;
  return { d: `M ${sx} ${ay} C ${c1} ${ay} ${c2} ${by} ${tx} ${by}`, sx, sy: ay, tx, ty: by, mx, my };
}
