/**
 * Auto-layout for imported diagrams — assigns table positions with dagre (MIT).
 * Pure & deterministic (dagre gives stable output for the same input). Node dimensions are
 * duplicated here (not imported from the canvas) to keep core framework-independent.
 */
import type { Diagram, Table } from '../model/types';

const NODE_W = 234;
const STRIP = 7;
const HEAD = 38;
const HEAD_COMMENT = 22;
const FIELD = 33;

const tableHeight = (t: Table): number =>
  STRIP + HEAD + (t.comment?.trim() ? HEAD_COMMENT : 0) + t.fields.length * FIELD;

export async function autoLayout(diagram: Diagram): Promise<Diagram> {
  const dagre = (await import('dagre')).default;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 90, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const t of diagram.tables) {
    g.setNode(t.id, { width: NODE_W, height: tableHeight(t) });
  }
  for (const r of diagram.relationships) {
    if (diagram.tables.some((t) => t.id === r.fromTableId) && diagram.tables.some((t) => t.id === r.toTableId)) {
      g.setEdge(r.fromTableId, r.toTableId);
    }
  }

  dagre.layout(g);

  return {
    ...diagram,
    tables: diagram.tables.map((t) => {
      const n = g.node(t.id);
      if (!n) return t;
      // dagre gives the node center; convert to top-left for our absolute positioning
      return { ...t, position: { x: Math.round(n.x - NODE_W / 2), y: Math.round(n.y - tableHeight(t) / 2) } };
    }),
  };
}
