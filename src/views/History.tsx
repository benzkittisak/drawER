/**
 * History — version timeline backed by real local snapshots (@store/useVersions).
 * Save a version, see structural diffs, and restore. The preview shows the current diagram.
 */
import { useState } from 'react';
import type { Table } from '@core';
import { useDiagram, useVersions } from '@store';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';
import { NODE_W } from '@canvas/geometry';

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

const relTime = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

function StaticNode({ t }: { t: Table }) {
  return (
    <div className="node" style={{ left: t.position.x, top: t.position.y, width: NODE_W, boxShadow: 'var(--shadow-sm)' }}>
      <div className="node__strip" style={{ background: t.color ?? 'var(--ink-4)' }} />
      <div className="node__head" style={{ cursor: 'default' }}>
        <Icon name="table" size={15} className="node__icon" />
        <div className="node__name">{t.name}</div>
      </div>
      {t.fields.map((f) => (
        <div key={f.id} className="node__field">
          <div className="node__grip" style={{ opacity: 0.3 }} />
          {f.primary && <Icon name="key" size={13} className="node__key" />}
          <div className={'node__fname' + (f.primary ? ' pk' : '')}>{f.name}</div>
          <div className="node__ftype">{f.type}</div>
        </div>
      ))}
    </div>
  );
}

export function History({ onBack }: { onBack: () => void }) {
  const diagram = useDiagram();
  const { list, diff, save, restore } = useVersions();
  const [tick, setTick] = useState(0);
  const versions = list();
  const [sel, setSel] = useState<string | null>(versions[0]?.id ?? null);
  void tick; // recomputed list each render; tick forces refresh after save/restore

  const saveNew = () => {
    const label = window.prompt('Name this version', `Snapshot ${new Date().toLocaleString()}`);
    if (label == null) return;
    const v = save(label.trim() || 'Untitled version');
    setTick((n) => n + 1);
    if (v) setSel(v.id);
  };

  const restoreSel = () => {
    if (!sel) return;
    restore(sel);
    onBack();
  };

  return (
    <div className="hist">
      <div className="topbar">
        <Btn variant="ghost" icon="arrowLeft" onClick={onBack}>
          Back to editor
        </Btn>
        <div style={{ width: 1, height: 24, background: 'var(--line)' }} />
        <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }}>Version history</div>
        <span className="crumb__sep">·</span>
        <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{diagram.name}</span>
        <div className="spacer" />
        <Btn icon="clock" onClick={saveNew}>
          Save version
        </Btn>
        <Btn variant="primary" icon="undo" disabled={!sel} onClick={restoreSel}>
          Restore this version
        </Btn>
      </div>

      <div className="hist__main">
        <div className="hist__list">
          <div className="panel__title" style={{ padding: '4px 6px 12px' }}>
            Timeline
          </div>
          {versions.length === 0 && (
            <div style={{ padding: '8px 6px', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.5 }}>
              No versions yet. Click <b>Save version</b> to snapshot the current diagram.
            </div>
          )}
          {versions.map((v, i) => (
            <div key={v.id} className={'ver' + (sel === v.id ? ' active' : '')} onClick={() => setSel(v.id)}>
              <div className="ver__rail">
                <div className="ver__node" />
                {i < versions.length - 1 && <div className="ver__line" />}
              </div>
              <div className="ver__body">
                <div className="ver__label">{v.label}</div>
                <div className="ver__meta">
                  <Avatar user={{ id: v.author, name: v.author, short: initials(v.author), color: v.authorColor }} size={18} />
                  {v.author} · {relTime(v.ts)}
                </div>
                <div className="ver__tags">
                  {diff(v.id).map((d, k) => (
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
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 5, display: 'flex', gap: 8 }}>
            <span className="chip" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
              <Icon name="table" size={13} />
              {diagram.tables.length} tables · current
            </span>
          </div>
          <div className="canvas" style={{ transform: 'translate(40px, 30px) scale(0.74)' }}>
            {diagram.tables.map((t) => (
              <StaticNode key={t.id} t={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
