/**
 * TableEditorPanel — edit the selected table in the right sidebar: rename, recolor,
 * add/edit/reorder/remove fields. All edits go through @store actions (Yjs).
 */
import { TYPE_KEYS, createField, newId } from '@core';
import { useEditorActions, useTable } from '@store';
import { Btn } from '@ui/atoms';

const COLORS = ['#6366f1', '#0d9488', '#d97706', '#e11d48', '#7c3aed', '#0284c7', '#16a34a', '#57534e'];

function Flag({ on, label, title, onClick }: { on: boolean; label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: '1px solid ' + (on ? 'var(--accent)' : 'var(--line)'),
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        background: on ? 'var(--accent-soft)' : 'var(--surface)',
        color: on ? 'var(--accent-strong)' : 'var(--ink-3)',
        flex: 'none',
      }}
    >
      {label}
    </button>
  );
}

export function TableEditorPanel({ tableId, onDeleted }: { tableId: string; onDeleted?: () => void }) {
  const table = useTable(tableId);
  const { updateTable, addField, updateField, removeField, reorderField, deleteEntity } = useEditorActions();

  if (!table) {
    return <div style={{ padding: '12px 4px', color: 'var(--ink-3)', fontSize: 13 }}>This table no longer exists.</div>;
  }

  const last = table.fields.length - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="field-row" style={{ gap: 8, paddingTop: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', width: 48, flexShrink: 0 }}>Name</label>
        <input
          className="input"
          value={table.name}
          onChange={(e) => updateTable(table.id, { name: e.target.value })}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>
      <div className="field-row" style={{ gap: 8, paddingBottom: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', width: 48, flexShrink: 0 }}>Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => updateTable(table.id, { color: c })}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: c,
                cursor: 'pointer',
                border: (table.color ?? '') === c ? '2px solid var(--ink)' : '1px solid var(--line-2)',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          margin: '10px 0 8px',
        }}
      >
        Fields
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {table.fields.map((f, i) => (
          <div
            key={f.id}
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
            }}
          >
            <input
              className="input"
              value={f.name}
              onChange={(e) => updateField(table.id, f.id, { name: e.target.value })}
              style={{ width: '100%', height: 30, marginBottom: 6 }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              <select
                value={f.type}
                onChange={(e) => updateField(table.id, f.id, { type: e.target.value })}
                style={{
                  flex: '1 1 100px',
                  height: 28,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                  color: 'var(--ink)',
                  padding: '0 6px',
                  minWidth: 0,
                }}
              >
                {TYPE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <Flag on={f.primary} label="PK" title="Primary key" onClick={() => updateField(table.id, f.id, { primary: !f.primary })} />
              <Flag on={f.notNull} label="NN" title="Not null" onClick={() => updateField(table.id, f.id, { notNull: !f.notNull })} />
              <Flag on={f.unique} label="UQ" title="Unique" onClick={() => updateField(table.id, f.id, { unique: !f.unique })} />
              <Flag
                on={f.autoIncrement}
                label="AI"
                title="Auto-increment"
                onClick={() => updateField(table.id, f.id, { autoIncrement: !f.autoIncrement })}
              />
              <Btn
                iconOnly
                sm
                variant="ghost"
                icon="chevronDown"
                title="Move up"
                disabled={i === 0}
                style={{ transform: 'rotate(180deg)' }}
                onClick={() => reorderField(table.id, f.id, i - 1)}
              />
              <Btn
                iconOnly
                sm
                variant="ghost"
                icon="chevronDown"
                title="Move down"
                disabled={i === last}
                onClick={() => reorderField(table.id, f.id, i + 1)}
              />
              <Btn iconOnly sm variant="ghost" icon="trash" title="Remove field" onClick={() => removeField(table.id, f.id)} />
            </div>
          </div>
        ))}
        {table.fields.length === 0 && (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '4px 2px' }}>No fields yet.</div>
        )}
      </div>

      <Btn
        sm
        variant="ghost"
        icon="plus"
        style={{ marginTop: 10, color: 'var(--accent-strong)', alignSelf: 'flex-start' }}
        onClick={() => addField(table.id, createField(newId(), `field_${table.fields.length + 1}`, 'varchar'))}
      >
        Add field
      </Btn>

      <Btn
        sm
        icon="trash"
        style={{ marginTop: 16, color: '#c0392b', alignSelf: 'flex-start' }}
        onClick={() => {
          deleteEntity(table.id);
          onDeleted?.();
        }}
      >
        Delete table
      </Btn>
    </div>
  );
}
