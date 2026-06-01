/**
 * History — version timeline + read-only preview. Ported from docs/design-reference/history.jsx.
 * M6 wires this to real local snapshots (Y.encodeStateAsUpdate) + computed diffs.
 */
import { useState } from 'react';
import * as seed from '@data/seed';
import type { DemoTable } from '@data/types';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';
import { NODE_W } from '@canvas/geometry';

function StaticNode({ t, dim }: { t: DemoTable; dim: boolean }) {
  return (
    <div
      className="node"
      style={{
        left: t.x,
        top: t.y,
        width: NODE_W,
        opacity: dim ? 0.42 : 1,
        boxShadow: 'var(--shadow-sm)',
        transition: 'opacity .3s',
      }}
    >
      <div className="node__strip" style={{ background: t.color }} />
      <div className="node__head" style={{ cursor: 'default' }}>
        <Icon name="table" size={15} className="node__icon" />
        <div className="node__name">{t.name}</div>
      </div>
      {t.fields.map((f) => (
        <div key={f.id} className="node__field">
          <div
            className="node__grip"
            style={{ opacity: f.fk ? 0.8 : 0.3, background: f.fk ? 'var(--accent)' : '#fff' }}
          />
          {f.pk && <Icon name="key" size={13} className="node__key" />}
          <div className={'node__fname' + (f.pk ? ' pk' : '')}>{f.name}</div>
          <div className="node__ftype">{f.type}</div>
        </div>
      ))}
    </div>
  );
}

const HIGHLIGHTS: Record<string, string[]> = {
  v6: ['subs', 'invoices'],
  v5: ['users'],
  v4: ['tasks'],
  v3: ['projects'],
  v2: ['orgs', 'projects'],
  v1: ['users'],
};

interface HistoryProps {
  onBack: () => void;
}

export function History({ onBack }: HistoryProps) {
  const [sel, setSel] = useState(seed.versions[0].id);
  const cur = seed.versions.find((v) => v.id === sel)!;
  const highlight = HIGHLIGHTS[sel] ?? [];

  return (
    <div className="hist">
      <div className="topbar">
        <Btn variant="ghost" icon="arrowLeft" onClick={onBack}>
          Back to editor
        </Btn>
        <div style={{ width: 1, height: 24, background: 'var(--line)' }} />
        <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }}>Version history</div>
        <span className="crumb__sep">·</span>
        <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Core Product DB</span>
        <div className="spacer" />
        <Btn icon="download">Export this version</Btn>
        <Btn variant="primary" icon="undo" disabled={cur.current}>
          {cur.current ? 'Current version' : 'Restore this version'}
        </Btn>
      </div>

      <div className="hist__main">
        <div className="hist__list">
          <div className="panel__title" style={{ padding: '4px 6px 12px' }}>
            Timeline
          </div>
          {seed.versions.map((v, i) => (
            <div
              key={v.id}
              className={'ver' + (sel === v.id ? ' active' : '')}
              onClick={() => setSel(v.id)}
            >
              <div className="ver__rail">
                <div className="ver__node" />
                {i < seed.versions.length - 1 && <div className="ver__line" />}
              </div>
              <div className="ver__body">
                <div className="ver__label">
                  {v.label}
                  {v.current && (
                    <span
                      className="chip"
                      style={{
                        height: 17,
                        marginLeft: 8,
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-strong)',
                        borderColor: 'transparent',
                      }}
                    >
                      current
                    </span>
                  )}
                </div>
                <div className="ver__meta">
                  <Avatar user={seed.users[v.who]} size={18} />
                  {v.who === 'you' ? 'You' : seed.users[v.who].name.split(' ')[0]} · {v.time}
                </div>
                <div className="ver__tags">
                  {v.diffs.map((d, k) => (
                    <span key={k} className={'difftag ' + d.t}>
                      {d.l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hist__preview">
          <div className="canvas-grid" />
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 5,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span className="chip" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
              <Avatar user={seed.users[cur.who]} size={16} />
              {cur.label}
            </span>
            <span className="chip" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--accent)' }} />
              {highlight.length} changed
            </span>
          </div>
          <div className="canvas" style={{ transform: 'translate(40px, 30px) scale(0.74)' }}>
            {seed.tables.map((t) => (
              <StaticNode key={t.id} t={t} dim={highlight.length > 0 && !highlight.includes(t.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
