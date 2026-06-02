/**
 * TableEditorPanel — edit the selected table in the right sidebar: general settings,
 * columns (with per-field index toggle), and composite indexes. All edits via @store (Yjs).
 */
import { useState, type DragEvent } from 'react';
import { TYPE_KEYS, createField, createIndex, newId, type Field, type Index, type Table } from '@core';
import { addRecentColor, getRecentColors, useEditorActions, useTable } from '@store';
import { Icon } from '@ui/Icon';
import { Btn } from '@ui/atoms';

const COLORS = ['#6366f1', '#0d9488', '#d97706', '#e11d48', '#7c3aed', '#0284c7', '#16a34a', '#57534e'];

type Section = 'general' | 'columns' | 'indexes';

function fieldIndexed(table: Table, fieldId: string): boolean {
  return table.indices.some((ix) => ix.fieldIds.includes(fieldId));
}

function Flag({
  on,
  label,
  title,
  onClick,
  className = '',
}: {
  on: boolean;
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      onClick={onClick}
      className={'te-flag' + (on ? ' te-flag--on' : '') + (className ? ` ${className}` : '')}
    >
      {label}
    </button>
  );
}

function FieldRow({
  table,
  field,
  index,
  dragId,
  overIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  updateField,
  removeField,
  toggleFieldIndex,
}: {
  table: Table;
  field: Field;
  index: number;
  dragId: string | null;
  overIndex: number | null;
  onDragStart: (fieldId: string) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  updateField: ReturnType<typeof useEditorActions>['updateField'];
  removeField: ReturnType<typeof useEditorActions>['removeField'];
  toggleFieldIndex: ReturnType<typeof useEditorActions>['toggleFieldIndex'];
}) {
  const dragging = dragId === field.id;
  const dropTarget = dragId !== null && dragId !== field.id && overIndex === index;
  const indexed = fieldIndexed(table, field.id);

  return (
    <div
      className={
        'field-editor__row field-editor__row--compact' +
        (dragging ? ' field-editor__row--dragging' : '') +
        (dropTarget ? ' field-editor__row--over' : '')
      }
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
    >
      <div
        className="field-editor__grip"
        draggable
        title="Drag to reorder"
        onDragStart={(e: DragEvent) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', field.id);
          onDragStart(field.id);
        }}
        onDragEnd={onDragEnd}
      >
        <Icon name="moreH" size={14} />
      </div>
      <div className="field-editor__grid">
        <input
          className="input input--sm"
          value={field.name}
          placeholder="column_name"
          onChange={(e) => updateField(table.id, field.id, { name: e.target.value })}
        />
        <select
          className="te-type"
          value={field.type}
          onChange={(e) => updateField(table.id, field.id, { type: e.target.value })}
        >
          {TYPE_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <div className="field-editor__flags">
          <Flag on={field.primary} label="PK" title="Primary key" onClick={() => updateField(table.id, field.id, { primary: !field.primary })} />
          <Flag on={field.notNull} label="NN" title="Not null" onClick={() => updateField(table.id, field.id, { notNull: !field.notNull })} />
          <Flag on={field.unique} label="UQ" title="Unique" onClick={() => updateField(table.id, field.id, { unique: !field.unique })} />
          <Flag
            on={field.autoIncrement}
            label="AI"
            title="Auto-increment"
            onClick={() => updateField(table.id, field.id, { autoIncrement: !field.autoIncrement })}
          />
          <Flag
            on={indexed}
            label="IX"
            title={indexed ? 'Remove from index(es)' : 'Add index on this column'}
            onClick={() => toggleFieldIndex(table.id, field.id)}
          />
          <Btn iconOnly sm variant="ghost" icon="trash" title="Remove column" onClick={() => removeField(table.id, field.id)} />
        </div>
      </div>
    </div>
  );
}

function IndexCard({
  table,
  index,
  updateIndex,
  removeIndex,
}: {
  table: Table;
  index: Index;
  updateIndex: ReturnType<typeof useEditorActions>['updateIndex'];
  removeIndex: ReturnType<typeof useEditorActions>['removeIndex'];
}) {
  const toggleField = (fieldId: string) => {
    const has = index.fieldIds.includes(fieldId);
    const next = has ? index.fieldIds.filter((id) => id !== fieldId) : [...index.fieldIds, fieldId];
    if (next.length === 0) removeIndex(table.id, index.id);
    else updateIndex(table.id, index.id, { fieldIds: next });
  };

  return (
    <div className="index-card">
      <div className="index-card__head">
        <input
          className="input input--sm"
          value={index.name}
          placeholder="index_name"
          onChange={(e) => updateIndex(table.id, index.id, { name: e.target.value })}
        />
        <label className="index-card__unique" title="Unique index">
          <input
            type="checkbox"
            checked={index.unique}
            onChange={(e) => updateIndex(table.id, index.id, { unique: e.target.checked })}
          />
          Unique
        </label>
        <Btn iconOnly sm variant="ghost" icon="trash" title="Remove index" onClick={() => removeIndex(table.id, index.id)} />
      </div>
      {table.fields.length === 0 ? (
        <div className="index-card__empty">Add columns first, then pick fields for this index.</div>
      ) : (
        <div className="index-card__fields">
          {table.fields.map((f) => (
            <label key={f.id} className="index-card__field">
              <input type="checkbox" checked={index.fieldIds.includes(f.id)} onChange={() => toggleField(f.id)} />
              <span>{f.name}</span>
              <span className="index-card__type">{f.type}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function TableEditorPanel({
  tableId,
  onDeleted,
  onAddForeignKey,
}: {
  tableId: string;
  onDeleted?: () => void;
  onAddForeignKey?: () => void;
}) {
  const table = useTable(tableId);
  const {
    updateTable,
    addField,
    updateField,
    removeField,
    reorderField,
    addIndex,
    updateIndex,
    removeIndex,
    toggleFieldIndex,
    deleteEntity,
  } = useEditorActions();
  const [section, setSection] = useState<Section>('columns');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [recentColors, setRecentColors] = useState(getRecentColors);

  if (!table) {
    return <div className="te-empty">This table no longer exists.</div>;
  }

  const endDrag = () => {
    setDragId(null);
    setOverIndex(null);
  };

  const dropOn = (toIndex: number) => {
    if (!dragId) return;
    const fromIndex = table.fields.findIndex((f) => f.id === dragId);
    if (fromIndex < 0 || fromIndex === toIndex) {
      endDrag();
      return;
    }
    reorderField(table.id, dragId, toIndex);
    endDrag();
  };

  const addNewIndex = () => {
    const n = table.indices.length + 1;
    const firstField = table.fields[0]?.id;
    addIndex(
      table.id,
      createIndex(newId(), `ix_${table.name}_${n}`, firstField ? [firstField] : [], false),
    );
  };

  return (
    <div className="te-root">
      <div className="te-section-tabs" role="tablist" aria-label="Table editor sections">
        {(['general', 'columns', 'indexes'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            className={'te-section-tab' + (section === s ? ' active' : '')}
            onClick={() => setSection(s)}
          >
            {s === 'general' ? 'General' : s === 'columns' ? `Columns (${table.fields.length})` : `Indexes (${table.indices.length})`}
          </button>
        ))}
      </div>

      {section === 'general' && (
        <div className="te-section">
          <label className="te-label">
            Table name
            <input className="input input--sm" value={table.name} onChange={(e) => updateTable(table.id, { name: e.target.value })} />
          </label>
          <label className="te-label">
            Description
            <textarea
              className="te-textarea"
              value={table.comment ?? ''}
              placeholder="What is this table for? (purpose, owner, notes…)"
              rows={4}
              onChange={(e) => updateTable(table.id, { comment: e.target.value })}
            />
          </label>
          <div className="te-label">Color</div>
          <div className="te-colors">
            {[...COLORS, ...recentColors.filter((c) => !COLORS.includes(c))].map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className={'te-swatch' + ((table.color ?? '').toLowerCase() === c ? ' te-swatch--on' : '')}
                style={{ background: c }}
                onClick={() => updateTable(table.id, { color: c })}
              />
            ))}
            <label className="te-swatch te-swatch--custom" title="Custom color…">
              <input
                type="color"
                value={table.color ?? '#6366f1'}
                onChange={(e) => updateTable(table.id, { color: e.target.value })}
                onBlur={(e) => setRecentColors(addRecentColor(e.target.value))}
              />
            </label>
          </div>
          {onAddForeignKey && (
            <Btn sm variant="ghost" icon="link" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={onAddForeignKey}>
              Add foreign key…
            </Btn>
          )}
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
      )}

      {section === 'columns' && (
        <div className="te-section">
          <Btn
            sm
            variant="ghost"
            icon="plus"
            style={{ color: 'var(--accent-strong)', alignSelf: 'flex-start' }}
            onClick={() => addField(table.id, createField(newId(), `field_${table.fields.length + 1}`, 'varchar'))}
          >
            Add column
          </Btn>
          <p className="te-hint">Drag the handle to reorder. Use IX for a quick single-column index.</p>
          <div className="field-editor__list">
            {table.fields.map((f, i) => (
              <FieldRow
                key={f.id}
                table={table}
                field={f}
                index={i}
                dragId={dragId}
                overIndex={overIndex}
                onDragStart={setDragId}
                onDragOver={setOverIndex}
                onDrop={dropOn}
                onDragEnd={endDrag}
                updateField={updateField}
                removeField={removeField}
                toggleFieldIndex={toggleFieldIndex}
              />
            ))}
            {table.fields.length === 0 && <div className="te-empty">No columns yet.</div>}
          </div>
        </div>
      )}

      {section === 'indexes' && (
        <div className="te-section">
          <p className="te-hint">Composite indexes can include multiple columns. Unique enforces uniqueness across the key.</p>
          <div className="index-card__list">
            {table.indices.map((ix) => (
              <IndexCard key={ix.id} table={table} index={ix} updateIndex={updateIndex} removeIndex={removeIndex} />
            ))}
            {table.indices.length === 0 && <div className="te-empty">No indexes defined.</div>}
          </div>
          <Btn sm variant="ghost" icon="plus" style={{ marginTop: 10, color: 'var(--accent-strong)' }} onClick={addNewIndex}>
            Add index
          </Btn>
        </div>
      )}
    </div>
  );
}
