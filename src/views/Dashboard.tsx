/**
 * Dashboard — team diagram library. Ported from docs/design-reference/dashboard.jsx.
 *
 * Team features (members, cross-diagram "live now", roles) need accounts + a backend and
 * are deferred to M7. M0 renders the seed library; "live now" is illustrative.
 */
import { useState } from 'react';
import * as seed from '@data/seed';
import type { DemoDiagram } from '@data/types';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';

function Thumb({ colors }: { colors: string[] }) {
  const layout = [
    { x: 16, y: 20, w: 64, rows: 3 },
    { x: 104, y: 38, w: 70, rows: 4 },
    { x: 196, y: 16, w: 60, rows: 2 },
    { x: 60, y: 92, w: 66, rows: 3 },
  ];
  return (
    <div className="card__thumb">
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <path d="M80 40 C 130 40, 90 70, 137 70" fill="none" stroke="var(--line-2)" strokeWidth={1.4} />
        <path d="M174 56 C 210 56, 200 36, 226 36" fill="none" stroke="var(--line-2)" strokeWidth={1.4} />
        <path d="M93 108 C 60 108, 110 80, 104 70" fill="none" stroke="var(--line-2)" strokeWidth={1.4} />
      </svg>
      {layout.map((m, i) => (
        <div key={i} className="mini" style={{ left: m.x, top: m.y, width: m.w }}>
          <div className="mini__strip" style={{ background: colors[i % colors.length] }} />
          {Array.from({ length: m.rows }).map((_, r) => (
            <div key={r} className="mini__row" />
          ))}
        </div>
      ))}
    </div>
  );
}

function Card({ d, onOpen }: { d: DemoDiagram; onOpen: () => void }) {
  return (
    <div className="card" onClick={onOpen}>
      <Thumb colors={d.colors} />
      <div className="card__body">
        <div className="card__name">{d.name}</div>
        <div className="card__meta">
          <span className="chip" style={{ height: 18, padding: '0 7px', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            {d.db}
          </span>
          <span>{d.tables} tables</span>
        </div>
        <div className="card__foot">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink-3)',
              fontSize: 11.5,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="clock" size={13} />
            {d.edited}
          </div>
          {d.live.length > 0 ? (
            <div className="card__live">
              <div className="presence">
                {d.live.map((id) => (
                  <Avatar key={id} user={seed.users[id]} size={22} />
                ))}
              </div>
              live
            </div>
          ) : (
            <div className="presence">
              <Avatar user={seed.users.you} size={22} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DashboardProps {
  onOpen: (id: string) => void;
}

export function Dashboard({ onOpen }: DashboardProps) {
  const [filter, setFilter] = useState<'all' | 'live'>('all');
  const shown = filter === 'live' ? seed.diagrams.filter((d) => d.live.length) : seed.diagrams;

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
          <input placeholder="Search diagrams, tables, people…" />
        </div>
        <div className="spacer" />
        <Btn variant="ghost" iconOnly icon="bell" title="Notifications" />
        <Btn variant="ghost" iconOnly icon="settings" title="Settings" />
        <Avatar user={seed.users.you} size={30} ring />
      </div>

      <div className="dash__wrap">
        <div className="dash__hero">
          <div>
            <div className="dash__h1">Product Team workspace</div>
            <div className="dash__sub">5 diagrams · 5 members · 3 collaborating right now</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="seg">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                All
              </button>
              <button className={filter === 'live' ? 'active' : ''} onClick={() => setFilter('live')}>
                Live now
              </button>
              <button onClick={() => setFilter('all')}>Mine</button>
            </div>
            <Btn variant="primary" icon="plus">
              New diagram
            </Btn>
          </div>
        </div>

        <div className="grid">
          {shown.map((d) => (
            <Card key={d.id} d={d} onOpen={() => onOpen(d.id)} />
          ))}
          <div className="card card--new" onClick={() => onOpen('d1')}>
            <div style={{ textAlign: 'center' }}>
              <Icon name="plus" size={26} />
              <div style={{ fontWeight: 700, marginTop: 8, fontSize: 14 }}>New diagram</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Start blank or from SQL</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
