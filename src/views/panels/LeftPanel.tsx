/**
 * LeftPanel — Tables / Relations tabs with search + list. Reads diagram state from @store;
 * advisory locks come from real teammate presence.
 */
import { useState } from 'react';
import { CARDINALITY_LABEL } from '@core';
import { useCanvasPresence, useRelationships, useSelectedRel, useSelection, useTables } from '@store';
import { Icon } from '@ui/Icon';
import { Btn } from '@ui/atoms';
import { AddRelationshipModal } from './AddRelationshipModal';

export function LeftPanel() {
  const tables = useTables();
  const rels = useRelationships();
  const { locks } = useCanvasPresence();
  const [selected, setSelected] = useSelection();
  const [selectedRel, setSelectedRel] = useSelectedRel();
  const [tab, setTab] = useState<'tables' | 'rels'>('tables');
  const [q, setQ] = useState('');
  const [addRelOpen, setAddRelOpen] = useState(false);
  const byId = Object.fromEntries(tables.map((t) => [t.id, t]));
  const filtered = tables.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="panel panel--left">
      <div className="panel__tabs">
        <button className={'ptab' + (tab === 'tables' ? ' active' : '')} onClick={() => setTab('tables')}>
          <Icon name="table" size={15} />
          Tables
          <span className="badge">{tables.length}</span>
        </button>
        <button className={'ptab' + (tab === 'rels' ? ' active' : '')} onClick={() => setTab('rels')}>
          <Icon name="link" size={15} />
          Relations
          <span className="badge">{rels.length}</span>
        </button>
      </div>

      {tab === 'tables' && (
        <>
          <div className="search">
            <Icon name="search" size={15} />
            <input placeholder="Search tables…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="panel__body">
            {filtered.map((t) => (
              <div
                key={t.id}
                className={'tl' + (selected === t.id ? ' active' : '')}
                onClick={() => setSelected(t.id)}
              >
                <div className="tl__swatch" style={{ background: t.color ?? 'var(--ink-4)' }} />
                <div className="tl__main">
                  <div className="tl__name">
                    {t.name}
                    {locks[t.id] && (
                      <span className="tl__lock" title={locks[t.id].name + ' editing'} style={{ color: locks[t.id].color }}>
                        <Icon name="lock" size={12} />
                      </span>
                    )}
                  </div>
                  <div className="tl__meta">{t.fields.length} fields</div>
                </div>
                <Icon name="chevronRight" size={15} style={{ color: 'var(--ink-4)' }} />
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '12px 10px', color: 'var(--ink-3)', fontSize: 13 }}>No tables</div>
            )}
          </div>
        </>
      )}

      {tab === 'rels' && (
        <>
          <div className="panel__head" style={{ padding: '8px 10px 4px' }}>
            <span className="panel__title">Foreign keys</span>
            <Btn
              sm
              variant="primary"
              icon="plus"
              onClick={() => setAddRelOpen(true)}
            >
              Add
            </Btn>
          </div>
          <div className="panel__body" style={{ paddingTop: 4 }}>
          {rels.map((r) => {
            const a = byId[r.fromTableId];
            const b = byId[r.toTableId];
            if (!a || !b) return null;
            const af = a.fields.find((f) => f.id === r.fromFieldId);
            const bf = b.fields.find((f) => f.id === r.toFieldId);
            return (
              <div
                key={r.id}
                className={'rl' + (selectedRel === r.id ? ' active' : '')}
                onClick={() => setSelectedRel(r.id)}
              >
                <div className="rl__top">
                  <span className="chip" style={{ height: 18, padding: '0 6px' }}>
                    {CARDINALITY_LABEL[r.cardinality]}
                  </span>
                  <span className="rl__card">
                    {a.name} → {b.name}
                  </span>
                </div>
                <div className="rl__bot">
                  {af?.name} references {b.name}({bf?.name})
                </div>
              </div>
            );
          })}
          {rels.length === 0 && (
            <div style={{ padding: '12px 10px', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.55 }}>
              No relationships yet. Use <b>Add</b> above, or drag from a field grip on the canvas.
            </div>
          )}
          </div>
        </>
      )}

      {addRelOpen && (
        <AddRelationshipModal
          fromTableId={selected ?? undefined}
          onClose={() => setAddRelOpen(false)}
        />
      )}
    </div>
  );
}
