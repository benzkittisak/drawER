/**
 * CursorsLayer — remote teammate cursors.
 *
 * M0/M1: cursors self-animate on a gentle lissajous path around the table each teammate
 * is "viewing" (faithful port of the design prototype, so the interactive demo looks alive).
 * M5 REPLACES this internal animation with real positions from the Yjs Awareness protocol
 * (see plan §Collaboration). The render markup + props stay the same so the swap is local.
 */
import { useEffect, useRef, useState } from 'react';
import type { Table } from '@core';
import type { DemoUser, LiveUser } from '@data/types';
import { NODE_W } from './geometry';

interface CursorsLayerProps {
  liveUsers: LiveUser[];
  users: Record<string, DemoUser>;
  byId: Record<string, Table>;
  motion: boolean;
}

interface Pt {
  x: number;
  y: number;
}
interface WaypointPath {
  cx: number;
  cy: number;
  r: number;
  phase: number;
  speed: number;
}

export function CursorsLayer({ liveUsers, users, byId, motion }: CursorsLayerProps) {
  const [pos, setPos] = useState<Record<string, Pt>>({});
  const stateRef = useRef<Record<string, WaypointPath>>({});

  useEffect(() => {
    const paths: Record<string, WaypointPath> = {};
    liveUsers.forEach((lu, k) => {
      const t = byId[lu.viewing];
      const cx = t ? t.position.x + NODE_W / 2 : 400 + k * 120;
      const cy = t ? t.position.y + 60 : 240;
      const r = 90 + k * 26;
      paths[lu.id] = { cx, cy, r, phase: k * 2.1, speed: 0.22 + k * 0.05 };
    });
    stateRef.current = paths;

    // Seed synchronously so cursors paint on first render (not rAF-dependent).
    const seed: Record<string, Pt> = {};
    Object.entries(paths).forEach(([id, p]) => {
      seed[id] = { x: p.cx + Math.cos(p.phase) * p.r, y: p.cy + Math.sin(p.phase * 0.9) * (p.r * 0.55) };
    });
    setPos(seed);

    if (!motion) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = (now - t0) / 1000;
      const next: Record<string, Pt> = {};
      Object.entries(stateRef.current).forEach(([id, p]) => {
        const ang = p.phase + el * p.speed;
        next[id] = {
          x: p.cx + Math.cos(ang) * p.r + Math.sin(ang * 1.7) * 22,
          y: p.cy + Math.sin(ang * 0.9) * (p.r * 0.55) + Math.cos(ang * 2.3) * 16,
        };
      });
      setPos(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [liveUsers, byId, motion]);

  return (
    <>
      {liveUsers.map((lu) => {
        const u = users[lu.id];
        const p = pos[lu.id];
        if (!u || !p) return null;
        return (
          <div key={lu.id} className="cursor" style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill={u.color}
              style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }}
            >
              <path d="M5 3l15 8-6 1.5L11 19 5 3Z" stroke="#fff" strokeWidth={1.4} />
            </svg>
            <div className="cursor__label" style={{ background: u.color }}>
              {u.name.split(' ')[0]}
            </div>
          </div>
        );
      })}
    </>
  );
}
