/**
 * RelationshipEditorPanel — edit cardinality and FK actions for the selected relationship.
 */
import {
  CARDINALITIES,
  CARDINALITY_LABEL,
  REF_ACTIONS,
  type Cardinality,
  type RefAction,
} from '@core';
import { useEditorActions, useRelationship, useTables } from '@store';
import { Btn } from '@ui/atoms';

const CARD_HINTS: Record<Cardinality, string> = {
  many_to_one: 'Many child rows point to one parent row (typical foreign key)',
  one_to_many: 'One parent row has many child rows',
  one_to_one: 'Exactly one row on each side',
  many_to_many: 'Many-to-many (needs a junction table in SQL)',
};

export function RelationshipEditorPanel({ relId, onDeleted }: { relId: string; onDeleted?: () => void }) {
  const rel = useRelationship(relId);
  const tables = useTables();
  const { updateRelationship, deleteEntity } = useEditorActions();

  if (!rel) {
    return <div style={{ padding: '12px 4px', color: 'var(--ink-3)', fontSize: 13 }}>This relationship no longer exists.</div>;
  }

  const from = tables.find((t) => t.id === rel.fromTableId);
  const to = tables.find((t) => t.id === rel.toTableId);
  const fromField = from?.fields.find((f) => f.id === rel.fromFieldId);
  const toField = to?.fields.find((f) => f.id === rel.toFieldId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>
        <div>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{from?.name ?? '?'}</span>.
          <span style={{ fontFamily: 'var(--mono)' }}>{fromField?.name ?? '?'}</span>
        </div>
        <div style={{ margin: '4px 0', color: 'var(--ink-3)', fontSize: 11 }}>references</div>
        <div>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{to?.name ?? '?'}</span>.
          <span style={{ fontFamily: 'var(--mono)' }}>{toField?.name ?? '?'}</span>
        </div>
      </div>

      <div>
        <div className="panel__title" style={{ marginBottom: 8 }}>
          Cardinality
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CARDINALITIES.map((c) => {
            const on = rel.cardinality === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => updateRelationship(rel.id, { cardinality: c })}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--line)'),
                  background: on ? 'var(--accent-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                  {CARDINALITY_LABEL[c]}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>{CARD_HINTS[c]}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="panel__title" style={{ marginBottom: 8 }}>
          On delete / update
        </div>
        <div className="field-row" style={{ gap: 8, padding: 0 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', width: 52 }}>Delete</label>
          <select
            className="input"
            value={rel.onDelete}
            onChange={(e) => updateRelationship(rel.id, { onDelete: e.target.value as RefAction })}
            style={{ height: 32, flex: 1 }}
          >
            {REF_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row" style={{ gap: 8, padding: '8px 0 0' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', width: 52 }}>Update</label>
          <select
            className="input"
            value={rel.onUpdate}
            onChange={(e) => updateRelationship(rel.id, { onUpdate: e.target.value as RefAction })}
            style={{ height: 32, flex: 1 }}
          >
            {REF_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Btn
        sm
        icon="trash"
        style={{ color: '#c0392b', alignSelf: 'flex-start', marginTop: 4 }}
        onClick={() => {
          deleteEntity(rel.id);
          onDeleted?.();
        }}
      >
        Delete relationship
      </Btn>
    </div>
  );
}
