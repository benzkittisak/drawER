/**
 * AddRelationshipModal — create a FK relationship by picking tables/fields (no canvas drag).
 * Scales to large diagrams via search filters on each side.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CARDINALITIES,
  CARDINALITY_LABEL,
  createRelationship,
  newId,
  type Cardinality,
  type Table,
} from '@core';
import { useEditorActions, useRelationships, useTables } from '@store';
import { Btn, Modal } from '@ui/atoms';

function pickField(table: Table, mode: 'fk' | 'pk'): string {
  if (table.fields.length === 0) return '';
  if (mode === 'pk') {
    return table.fields.find((f) => f.primary)?.id ?? table.fields[0].id;
  }
  return table.fields.find((f) => !f.primary)?.id ?? table.fields[0].id;
}

function TableFieldPick({
  label,
  hint,
  tables,
  tableId,
  fieldId,
  onTable,
  onField,
  excludeTableId,
}: {
  label: string;
  hint: string;
  tables: Table[];
  tableId: string;
  fieldId: string;
  onTable: (id: string) => void;
  onField: (id: string) => void;
  excludeTableId?: string;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return tables
      .filter((t) => t.id !== excludeTableId)
      .filter((t) => !qq || t.name.toLowerCase().includes(qq));
  }, [tables, q, excludeTableId]);

  const table = tables.find((t) => t.id === tableId);
  const fields = table?.fields ?? [];

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: 12,
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--surface-2)',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '2px 0 10px', lineHeight: 1.4 }}>{hint}</div>
      <input
        className="input"
        placeholder="Search tables…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ height: 32, marginBottom: 8 }}
      />
      <select
        className="input"
        value={tableId}
        onChange={(e) => onTable(e.target.value)}
        style={{ height: 34, marginBottom: 8, width: '100%' }}
      >
        <option value="">Select table…</option>
        {filtered.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={fieldId}
        onChange={(e) => onField(e.target.value)}
        disabled={!tableId || fields.length === 0}
        style={{ height: 34, width: '100%', fontFamily: 'var(--mono)', fontSize: 12.5 }}
      >
        <option value="">Select column…</option>
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
            {f.primary ? ' (PK)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AddRelationshipModal({
  onClose,
  fromTableId: initialFromTableId,
}: {
  onClose: () => void;
  fromTableId?: string;
}) {
  const tables = useTables();
  const rels = useRelationships();
  const { addRelationship } = useEditorActions();

  const [fromTableId, setFromTableId] = useState('');
  const [fromFieldId, setFromFieldId] = useState('');
  const [toTableId, setToTableId] = useState('');
  const [toFieldId, setToFieldId] = useState('');
  const [cardinality, setCardinality] = useState<Cardinality>('many_to_one');
  const [error, setError] = useState('');
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || tables.length === 0) return;
    seeded.current = true;
    const fromT = initialFromTableId && tables.some((t) => t.id === initialFromTableId)
      ? initialFromTableId
      : tables[0].id;
    const toT = tables.find((t) => t.id !== fromT)?.id ?? '';
    setFromTableId(fromT);
    setFromFieldId(pickField(tables.find((t) => t.id === fromT)!, 'fk'));
    if (toT) {
      setToTableId(toT);
      setToFieldId(pickField(tables.find((t) => t.id === toT)!, 'pk'));
    }
  }, [initialFromTableId, tables]);

  const onFromTable = (id: string) => {
    setFromTableId(id);
    const t = tables.find((x) => x.id === id);
    setFromFieldId(t ? pickField(t, 'fk') : '');
    if (id && id === toTableId) {
      const other = tables.find((x) => x.id !== id);
      if (other) {
        setToTableId(other.id);
        setToFieldId(pickField(other, 'pk'));
      } else {
        setToTableId('');
        setToFieldId('');
      }
    }
    setError('');
  };

  const onToTable = (id: string) => {
    setToTableId(id);
    const t = tables.find((x) => x.id === id);
    setToFieldId(t ? pickField(t, 'pk') : '');
    setError('');
  };

  const submit = () => {
    if (!fromTableId || !fromFieldId || !toTableId || !toFieldId) {
      setError('Choose both tables and columns.');
      return;
    }
    if (fromTableId === toTableId) {
      setError('Tables must be different.');
      return;
    }
    const dup = rels.some(
      (r) =>
        r.fromTableId === fromTableId &&
        r.fromFieldId === fromFieldId &&
        r.toTableId === toTableId &&
        r.toFieldId === toFieldId,
    );
    if (dup) {
      setError('This relationship already exists.');
      return;
    }
    addRelationship(
      createRelationship(
        newId(),
        { tableId: fromTableId, fieldId: fromFieldId },
        { tableId: toTableId, fieldId: toFieldId },
        { cardinality },
      ),
    );
    onClose();
  };

  return (
    <Modal
      title="Add relationship"
      onClose={onClose}
      width={640}
      foot={
        <>
          <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-3)' }}>
            Tip: you can still drag from a field grip on the canvas.
          </span>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit} disabled={tables.length < 2}>
            Add relationship
          </Btn>
        </>
      }
    >
      {tables.length < 2 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Add at least two tables before linking them.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <TableFieldPick
              label="From (FK column)"
              hint="Child table — column that stores the foreign key"
              tables={tables}
              tableId={fromTableId}
              fieldId={fromFieldId}
              onTable={onFromTable}
              onField={setFromFieldId}
              excludeTableId={toTableId}
            />
            <div style={{ display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 18, paddingTop: 28 }}>→</div>
            <TableFieldPick
              label="To (referenced)"
              hint="Parent table — column being referenced (usually primary key)"
              tables={tables}
              tableId={toTableId}
              fieldId={toFieldId}
              onTable={onToTable}
              onField={setToFieldId}
              excludeTableId={fromTableId}
            />
          </div>

          <div className="field-row" style={{ gap: 10, padding: '14px 0 0' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', width: 88 }}>Cardinality</label>
            <select
              className="input"
              value={cardinality}
              onChange={(e) => setCardinality(e.target.value as Cardinality)}
              style={{ height: 34, flex: 1 }}
            >
              {CARDINALITIES.map((c) => (
                <option key={c} value={c}>
                  {CARDINALITY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: '#c0392b', fontWeight: 600 }}>{error}</div>
          )}
        </>
      )}
    </Modal>
  );
}
