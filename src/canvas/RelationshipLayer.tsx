/**
 * RelationshipLayer — orthogonal edges between field rows, cardinality markers, and labels.
 * Renders graphics below tables; use RelationshipHitLayer on top for selection.
 */
import { memo, useMemo } from 'react';
import type { Relationship, Table } from '@core';
import { CARDINALITY_LABEL } from '@core';
import {
  fieldCenterY,
  fieldIndex,
  nodeHeight,
  NODE_W,
  relEndpointKinds,
  relPathBetween,
  wirePath,
  type DiagramBounds,
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
  selectedRel: string | null;
  hotRel: string | null;
  linking: LinkingState | null;
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
  /** Table objects (not a map) so the edge memoizes on table identity — see relPathBetween. */
  from: Table | undefined;
  to: Table | undefined;
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

const RelEdgeGraphics = memo(function RelEdgeGraphics({ rel, from, to, active }: EdgeProps) {
  const g = useMemo(() => relPathBetween(rel, from, to), [rel, from, to]);
  if (!g) return null;
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

  return (
    <svg className="canvas-layer canvas-layer--rels" width={SVGW} height={SVGH} aria-hidden style={{ pointerEvents: 'none' }}>
      {rels.map((r) => {
        const from = byId[r.fromTableId];
        const to = byId[r.toTableId];
        if (viewRect && !edgeInView(from, to, viewRect)) return null;
        const active = hotRel === r.id || selectedRel === r.id;
        return <RelEdgeGraphics key={r.id} rel={r} from={from} to={to} active={active} />;
      })}
      {linkingPath && <path d={linkingPath} className="rel-path rel-path--linking" />}
    </svg>
  );
});

interface HitProps {
  rel: Relationship;
  from: Table | undefined;
  to: Table | undefined;
  active: boolean;
  onHot: (id: string | null) => void;
  onSelectRel: (id: string) => void;
  onContextMenuRel: (id: string, clientX: number, clientY: number) => void;
}

const RelHitPath = memo(function RelHitPath({
  rel,
  from,
  to,
  active,
  onHot,
  onSelectRel,
  onContextMenuRel,
}: HitProps) {
  const g = useMemo(() => relPathBetween(rel, from, to), [rel, from, to]);
  if (!g) return null;
  return (
    <path
      d={g.d}
      className={'rel-path-hit' + (active ? ' rel-path-hit--active' : '')}
      onMouseEnter={() => onHot(rel.id)}
      onMouseLeave={() => onHot(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelectRel(rel.id);
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
  selectedRel,
  hotRel,
  viewRect,
  onHot,
  onSelectRel,
  onContextMenuRel,
}: LayerProps & {
  onHot: (id: string | null) => void;
  onSelectRel: (id: string) => void;
  onContextMenuRel: (id: string, clientX: number, clientY: number) => void;
}) {
  return (
    <svg className="canvas-layer canvas-layer--rel-hits" width={SVGW} height={SVGH} aria-hidden>
      {rels.map((r) => {
        const from = byId[r.fromTableId];
        const to = byId[r.toTableId];
        if (viewRect && !edgeInView(from, to, viewRect)) return null;
        const active = hotRel === r.id || selectedRel === r.id;
        return (
          <RelHitPath
            key={r.id}
            rel={r}
            from={from}
            to={to}
            active={active}
            onHot={onHot}
            onSelectRel={onSelectRel}
            onContextMenuRel={onContextMenuRel}
          />
        );
      })}
    </svg>
  );
});
