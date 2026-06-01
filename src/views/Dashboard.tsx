/**
 * Dashboard — the diagram library. Lists diagrams from the server database (GET /api/diagrams)
 * and falls back to the local store (localStorage) when the server is unreachable (offline).
 * Refreshes from PostgreSQL on mount (page load / return from editor).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDiagram, refreshDiagramLibrary, useIdentity, type DiagramSummary } from '@store';
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

function Card({
  d,
  me,
  onOpen,
  onDelete,
}: {
  d: DiagramSummary;
  me: MeUser;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const dbLabel = DIALECT_LABELS[d.dialect as DialectId] ?? d.dialect;
  return (
    <div className="card" onClick={onOpen}>
      <div className="card__delete" onClick={(e) => e.stopPropagation()}>
        <Btn
          iconOnly
          sm
          variant="ghost"
          icon="trash"
          title="Delete diagram"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        />
      </div>
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
  const [all, setAll] = useState<DiagramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const loadLibrary = useCallback(() => {
    setLoading(true);
    void refreshDiagramLibrary()
      .then((r) => {
        setAll(r.diagrams);
        setOffline(!r.serverReachable);
      })
      .catch((e) => {
        console.error('Dashboard library load failed', e);
        setOffline(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const shown = useMemo(() => all.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())), [all, q]);

  const removeDiagram = async (d: DiagramSummary) => {
    if (!window.confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    const ok = await deleteDiagram(d.id);
    if (!ok) {
      window.alert('Could not delete on the server. Check that sync is running and try again.');
      return;
    }
    setAll((list) => list.filter((x) => x.id !== d.id));
    loadLibrary();
  };

  const subtitle = loading
    ? 'Loading…'
    : offline
      ? `${all.length} ${all.length === 1 ? 'diagram' : 'diagrams'} (offline — refresh when sync is up)`
      : `${all.length} ${all.length === 1 ? 'diagram' : 'diagrams'}`;

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
            <div className="dash__sub">{subtitle}</div>
          </div>
          <Btn variant="primary" icon="plus" onClick={onNew}>
            New diagram
          </Btn>
        </div>

        <div className="grid">
          {shown.map((d) => (
            <Card key={d.id} d={d} me={me} onOpen={() => onOpen(d.id)} onDelete={() => removeDiagram(d)} />
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
