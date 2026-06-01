/**
 * Dashboard — the diagram library. Lists diagrams from the server database (GET /api/diagrams)
 * and falls back to the local store (localStorage) when the server is unreachable (offline).
 */
import { useEffect, useMemo, useState } from 'react';
import { listDiagrams, useIdentity, type DiagramSummary } from '@store';
import { DIALECT_LABELS, type DialectId } from '@core';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';
import { CreditsModal } from './panels/CreditsModal';

interface MeUser {
  id: string;
  name: string;
  short: string;
  color: string;
}

// REST base derived from the sync URL (ws://host -> http://host, wss -> https).
const API_URL = ((import.meta.env.VITE_SYNC_URL as string) || 'ws://localhost:1234').replace(/^ws/, 'http');

function relativeTime(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`;
}

function Thumb({ colors }: { colors: string[] }) {
  const layout = [
    { x: 16, y: 20, w: 64, rows: 3 },
    { x: 104, y: 38, w: 70, rows: 4 },
    { x: 196, y: 16, w: 60, rows: 2 },
    { x: 60, y: 92, w: 66, rows: 3 },
  ];
  const palette = colors.length ? colors : ['var(--ink-4)'];
  return (
    <div className="card__thumb">
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <path d="M80 40 C 130 40, 90 70, 137 70" fill="none" stroke="var(--line-2)" strokeWidth={1.4} />
        <path d="M174 56 C 210 56, 200 36, 226 36" fill="none" stroke="var(--line-2)" strokeWidth={1.4} />
        <path d="M93 108 C 60 108, 110 80, 104 70" fill="none" stroke="var(--line-2)" strokeWidth={1.4} />
      </svg>
      {layout.map((m, i) => (
        <div key={i} className="mini" style={{ left: m.x, top: m.y, width: m.w }}>
          <div className="mini__strip" style={{ background: palette[i % palette.length] }} />
          {Array.from({ length: m.rows }).map((_, r) => (
            <div key={r} className="mini__row" />
          ))}
        </div>
      ))}
    </div>
  );
}

function Card({ d, me, onOpen }: { d: DiagramSummary; me: MeUser; onOpen: () => void }) {
  const dbLabel = DIALECT_LABELS[d.dialect as DialectId] ?? d.dialect;
  return (
    <div className="card" onClick={onOpen}>
      <Thumb colors={d.colors} />
      <div className="card__body">
        <div className="card__name">{d.name}</div>
        <div className="card__meta">
          <span className="chip" style={{ height: 18, padding: '0 7px', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            {dbLabel}
          </span>
          <span>{d.tableCount} tables</span>
        </div>
        <div className="card__foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
            <Icon name="clock" size={13} />
            {relativeTime(d.updatedAt)}
          </div>
          <div className="presence">
            <Avatar user={me} size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DashboardProps {
  onOpen: (id: string) => void;
  onNew: () => void;
}

export function Dashboard({ onOpen, onNew }: DashboardProps) {
  const [q, setQ] = useState('');
  const [creditsOpen, setCreditsOpen] = useState(false);
  const identity = useIdentity();
  const me: MeUser = { id: identity.id, name: 'You', short: 'ME', color: identity.color };
  const [remote, setRemote] = useState<DiagramSummary[] | null>(null);

  // Fetch the real list from the server DB; null = offline → fall back to the local store.
  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/diagrams`)
      .then((r) => r.json())
      .then((rows: { id: string; name: string; dialect: string; tableCount: number; updatedAt: number }[]) => {
        if (active)
          setRemote(rows.map((r) => ({ id: r.id, name: r.name, dialect: r.dialect, tableCount: r.tableCount, colors: [], updatedAt: r.updatedAt })));
      })
      .catch(() => active && setRemote(null));
    return () => {
      active = false;
    };
  }, []);

  // Merge: server is the source of truth; keep local-only diagrams + local thumbnail colors.
  const all = useMemo(() => {
    const byId = new Map<string, DiagramSummary>();
    for (const d of listDiagrams()) byId.set(d.id, d);
    if (remote) for (const d of remote) byId.set(d.id, { ...d, colors: byId.get(d.id)?.colors ?? d.colors });
    return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [remote]);

  const shown = useMemo(() => all.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())), [all, q]);

  return (
    <div className="dash">
      <div className="dash__bar">
        <div className="brand">
          <div className="brand__mark">
            <Icon name="table" size={15} />
          </div>
          <div className="brand__name">
            draw<b>DB</b> Live
          </div>
        </div>
        <div className="search" style={{ flex: 1, maxWidth: 380, margin: 0 }}>
          <Icon name="search" size={15} />
          <input placeholder="Search diagrams…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="spacer" />
        <Btn variant="ghost" iconOnly icon="bell" title="Notifications" />
        <Btn variant="ghost" iconOnly icon="settings" title="About & credits" onClick={() => setCreditsOpen(true)} />
        <Avatar user={me} size={30} ring />
      </div>

      <div className="dash__wrap">
        <div className="dash__hero">
          <div>
            <div className="dash__h1">Your workspace</div>
            <div className="dash__sub">
              {all.length} {all.length === 1 ? 'diagram' : 'diagrams'} · local-first · synced when shared
            </div>
          </div>
          <Btn variant="primary" icon="plus" onClick={onNew}>
            New diagram
          </Btn>
        </div>

        <div className="grid">
          {shown.map((d) => (
            <Card key={d.id} d={d} me={me} onOpen={() => onOpen(d.id)} />
          ))}
          <div className="card card--new" onClick={onNew}>
            <div style={{ textAlign: 'center' }}>
              <Icon name="plus" size={26} />
              <div style={{ fontWeight: 700, marginTop: 8, fontSize: 14 }}>New diagram</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Start blank or import SQL</div>
            </div>
          </div>
        </div>
      </div>
      {creditsOpen && <CreditsModal onClose={() => setCreditsOpen(false)} />}
    </div>
  );
}
