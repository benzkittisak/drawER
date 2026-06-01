/**
 * RemoteCursorsLayer — real teammate cursors from Yjs Awareness. Positions arrive in CANVAS
 * coordinates; this renders inside the pan/zoom-transformed canvas layer, so each peer's cursor
 * lands on the same logical point for every viewer. A single rAF loop interpolates toward each
 * incoming target so 30–60fps updates look smooth. Stale peers are dropped as they leave.
 */
import { useEffect, useRef, useState } from 'react';
import { useRemoteCursors } from '@store';

type Pt = { x: number; y: number };

export function RemoteCursorsLayer() {
  const cursors = useRemoteCursors();
  const targets = useRef<Map<number, Pt>>(new Map());
  const current = useRef<Map<number, Pt>>(new Map());
  const [, force] = useState(0);
  const raf = useRef(0);

  // update targets when new awareness positions arrive
  useEffect(() => {
    const live = new Set<number>();
    for (const c of cursors) {
      live.add(c.id);
      targets.current.set(c.id, { x: c.x, y: c.y });
      if (!current.current.has(c.id)) current.current.set(c.id, { x: c.x, y: c.y });
    }
    for (const id of [...current.current.keys()]) {
      if (!live.has(id)) {
        current.current.delete(id);
        targets.current.delete(id);
      }
    }
  }, [cursors]);

  // one shared interpolation loop
  useEffect(() => {
    const tick = () => {
      let moved = false;
      current.current.forEach((cur, id) => {
        const t = targets.current.get(id);
        if (!t) return;
        const nx = cur.x + (t.x - cur.x) * 0.3;
        const ny = cur.y + (t.y - cur.y) * 0.3;
        if (Math.abs(nx - cur.x) > 0.05 || Math.abs(ny - cur.y) > 0.05) {
          current.current.set(id, { x: nx, y: ny });
          moved = true;
        }
      });
      if (moved) force((n) => n + 1);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <>
      {cursors.map((c) => {
        const p = current.current.get(c.id) ?? { x: c.x, y: c.y };
        return (
          <div key={c.id} className="cursor" style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill={c.color} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }}>
              <path d="M5 3l15 8-6 1.5L11 19 5 3Z" stroke="#fff" strokeWidth={1.4} />
            </svg>
            <div className="cursor__label" style={{ background: c.color }}>
              {c.name.split(' ')[0]}
            </div>
          </div>
        );
      })}
    </>
  );
}
