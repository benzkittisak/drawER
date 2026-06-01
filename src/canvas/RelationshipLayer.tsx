/**
 * RelationshipLayer — orthogonal edges between field rows, cardinality markers, and labels.
 * Renders graphics below tables; use RelationshipHitLayer on top for selection.
 */
import { memo } from 'react';
import type { Relationship, Table } from '@core';
import { CARDINALITY_LABEL } from '@core';
import {
  fieldCenterY,
  fieldIndex,
  nodeHeight,
  NODE_W,
  orderRelsForPaint,
  relEndpointKinds,
  wirePath,
  type DiagramBounds,
  type RelGeometry,
} from './geometry';

export interface LinkingState {
  fromT: string;
  fromF: string;
  x: number;
  y: number;
}

const SVGW = 2600;
const SVGH = 1600;

interface LayerProps {
  rels: Relationship[];
  byId: Record<string, Table>;
  relGeometries: Map<string, RelGeometry | null>;
  selectedRel: string | null;
  hotRel: string | null;
  linking?: LinkingState | null;
  /** When set (large diagrams), skip edges whose endpoints' bounding box is outside the viewport. */
  viewRect?: DiagramBounds | null;
}

/** Does the bounding box spanning both endpoint tables intersect the (padded) viewport rect? */
function edgeInView(a: Table | undefined, b: Table | undefined, vr: DiagramBounds): boolean {
  if (!a || !b) return false;
  const minX = Math.min(a.position.x, b.position.x);
  const maxX = Math.max(a.position.x + NODE_W, b.position.x + NODE_W);
  const minY = Math.min(a.position.y, b.position.y);
  const maxY = Math.max(a.position.y + nodeHeight(a), b.position.y + nodeHeight(b));
  return minX <= vr.maxX && maxX >= vr.minX && minY <= vr.maxY && maxY >= vr.minY;
}

interface EdgeProps {
  rel: Relationship;
  geometry: RelGeometry;
  active: boolean;
}

function EndpointMarker({
  x,
  y,
  horiz,
  kind,
}: {
  x: number;
  y: number;
  horiz: 1 | -1;
  kind: 'one' | 'many';
}) {
  const perp = 7;
  const along = horiz * 8;
  if (kind === 'one') {
    return (
      <line
        x1={x - along * 0.2}
        y1={y - perp}
        x2={x - along * 0.2}
        y2={y + perp}
        className="rel-marker"
      />
    );
  }
  const spread = 5;
  return (
    <g className="rel-marker">
      <line x1={x} y1={y} x2={x + along} y2={y - spread} />
      <line x1={x} y1={y} x2={x + along} y2={y} />
      <line x1={x} y1={y} x2={x + along} y2={y + spread} />
    </g>
  );
}

const RelEdgeGraphics = memo(function RelEdgeGraphics({ rel, geometry: g, active }: EdgeProps) {
  const kinds = relEndpointKinds(rel.cardinality);
  const label = CARDINALITY_LABEL[rel.cardinality];
  const lw = label.length * 6.2 + 14;

  return (
    <g className={'rel-edge' + (active ? ' rel-edge--active' : '')}>
      <path d={g.d} className="rel-path" />
      <circle cx={g.sx} cy={g.sy} r={4} className="rel-dot rel-dot--from" />
      <circle cx={g.tx} cy={g.ty} r={4} className="rel-dot rel-dot--to" />
      <EndpointMarker x={g.sx} y={g.sy} horiz={g.fromHoriz} kind={kinds.from} />
      <EndpointMarker x={g.tx} y={g.ty} horiz={g.toHoriz} kind={kinds.to} />
      <rect x={g.labelX - lw / 2} y={g.labelY - 10} width={lw} height={18} rx={6} className="rel-label-bg" />
      <text x={g.labelX} y={g.labelY + 4} textAnchor="middle" className="rel-card">
        {label}
      </text>
    </g>
  );
});

export const RelationshipLayer = memo(function RelationshipLayer({
  rels,
  byId,
  relGeometries,
  selectedRel,
  hotRel,
  linking,
  viewRect,
}: LayerProps) {
  let linkingPath: string | null = null;
  if (linking) {
    const a = byId[linking.fromT];
    if (a) {
      const ai = fieldIndex(a, linking.fromF);
      linkingPath = wirePath(a.position.x + NODE_W, fieldCenterY(a, ai), linking.x, linking.y, false).d;
    }
  }

  const paintRels = orderRelsForPaint(rels, selectedRel, hotRel);

  return (
    <svg className="canvas-layer canvas-layer--rels" width={SVGW} height={SVGH} aria-hidden style={{ pointerEvents: 'none' }}>
      {paintRels.map((r) => {
        const g = relGeometries.get(r.id);
        if (!g) return null;
        const from = byId[r.fromTableId];
        const to = byId[r.toTableId];
        if (viewRect && !edgeInView(from, to, viewRect)) return null;
        const active = hotRel === r.id || selectedRel === r.id;
        return <RelEdgeGraphics key={r.id} rel={r} geometry={g} active={active} />;
      })}
      {linkingPath && <path d={linkingPath} className="rel-path rel-path--linking" />}
    </svg>
  );
});

interface HitProps {
  rel: Relationship;
  geometry: RelGeometry;
  active: boolean;
  onHot: (id: string | null) => void;
  onSelectRel: (id: string, clientX: number, clientY: number) => void;
  onFocusRel: (id: string) => void;
  onContextMenuRel: (id: string, clientX: number, clientY: number) => void;
}

const RelHitPath = memo(function RelHitPath({
  rel,
  geometry: g,
  active,
  onHot,
  onSelectRel,
  onFocusRel,
  onContextMenuRel,
}: HitProps) {
  return (
    <path
      d={g.d}
      data-rel-id={rel.id}
      className={'rel-path-hit' + (active ? ' rel-path-hit--active' : '')}
      onMouseEnter={() => onHot(rel.id)}
      onMouseLeave={() => onHot(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelectRel(rel.id, e.clientX, e.clientY);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFocusRel(rel.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenuRel(rel.id, e.clientX, e.clientY);
      }}
    />
  );
});

export const RelationshipHitLayer = memo(function RelationshipHitLayer({
  rels,
  byId,
  relGeometries,
  selectedRel,
  hotRel,
  viewRect,
  onHot,
  onSelectRel,
  onFocusRel,
  onContextMenuRel,
}: LayerProps & {
  onHot: (id: string | null) => void;
  onSelectRel: (id: string, clientX: number, clientY: number) => void;
  onFocusRel: (id: string) => void;
  onContextMenuRel: (id: string, clientX: number, clientY: number) => void;
}) {
  const paintRels = orderRelsForPaint(rels, selectedRel, hotRel);

  return (
    <svg className="canvas-layer canvas-layer--rel-hits" width={SVGW} height={SVGH} aria-hidden>
      {paintRels.map((r) => {
        const g = relGeometries.get(r.id);
        if (!g) return null;
        const from = byId[r.fromTableId];
        const to = byId[r.toTableId];
        if (viewRect && !edgeInView(from, to, viewRect)) return null;
        const active = hotRel === r.id || selectedRel === r.id;
        return (
          <RelHitPath
            key={r.id}
            rel={r}
            geometry={g}
            active={active}
            onHot={onHot}
            onSelectRel={onSelectRel}
            onFocusRel={onFocusRel}
            onContextMenuRel={onContextMenuRel}
          />
        );
      })}
    </svg>
  );
});
