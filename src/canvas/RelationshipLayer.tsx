/**
 * RelationshipLayer — the SVG edges between table fields, plus the live "linking" line shown
 * while dragging from a field grip. Over the core model.
 */
import type { Relationship, Table } from '@core';
import { CARDINALITY_LABEL } from '@core';
import { fieldCenterY, fieldIndex, NODE_W, relPath } from './geometry';

const SVGW = 2600;
const SVGH = 1600;

export interface LinkingState {
  fromT: string;
  fromF: string;
  x: number;
  y: number;
}

interface RelationshipLayerProps {
  rels: Relationship[];
  byId: Record<string, Table>;
  hotRel: string | null;
  onHot: (id: string | null) => void;
  linking: LinkingState | null;
}

export function RelationshipLayer({ rels, byId, hotRel, onHot, linking }: RelationshipLayerProps) {
  let linkingPath: string | null = null;
  if (linking) {
    const a = byId[linking.fromT];
    if (a) {
      const ai = fieldIndex(a, linking.fromF);
      const sx = a.position.x + NODE_W;
      const sy = fieldCenterY(a, ai);
      linkingPath = `M ${sx} ${sy} C ${sx + 60} ${sy} ${linking.x - 60} ${linking.y} ${linking.x} ${linking.y}`;
    }
  }

  return (
    <svg className="canvas-layer" width={SVGW} height={SVGH} style={{ pointerEvents: 'none' }}>
      {rels.map((r) => {
        const g = relPath(r, byId);
        if (!g) return null;
        const hot = hotRel === r.id;
        return (
          <g
            key={r.id}
            style={{ pointerEvents: 'stroke' }}
            onMouseEnter={() => onHot(r.id)}
            onMouseLeave={() => onHot(null)}
          >
            <path d={g.d} className={'rel-path' + (hot ? ' hot' : '')} />
            <circle cx={g.sx} cy={g.sy} r={3.4} className="rel-dot" />
            <circle cx={g.tx} cy={g.ty} r={3.4} className="rel-dot" />
            <rect
              x={g.mx - 15}
              y={g.my - 9}
              width={30}
              height={16}
              rx={5}
              fill="var(--surface)"
              stroke="var(--line)"
            />
            <text x={g.mx} y={g.my + 3} textAnchor="middle" className="rel-card">
              {CARDINALITY_LABEL[r.cardinality]}
            </text>
          </g>
        );
      })}
      {linkingPath && (
        <path d={linkingPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" />
      )}
    </svg>
  );
}
