/**
 * TableEditorPanel — edit the selected table in the right sidebar: general settings,
 * columns (with per-field index toggle), and composite indexes. All edits via @store (Yjs).
 */
import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import { TYPE_KEYS, createField, createIndex, newId, type Field, type Index, type Relationship, type Table } from '@core';
import { addRecentColor, getRecentColors, useEditorActions, useRelationships, useTable, useTables } from '@store';
import { Icon } from '@ui/Icon';
import { Btn } from '@ui/atoms';
import { DraftInput, DraftTextarea } from '@ui/DraftInput';

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
  dragging,
  dropTarget,
  selected,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  updateField,
  removeField,
  toggleFieldIndex,
  fkOn,
  fkTitle,
  onToggleFk,
}: {
  table: Table;
  field: Field;
  index: number;
  dragging: boolean;
  dropTarget: boolean;
  selected: boolean;
  onSelect: (fieldId: string, e: MouseEvent) => void;
  onDragStart: (fieldId: string) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  updateField: ReturnType<typeof useEditorActions>['updateField'];
  removeField: ReturnType<typeof useEditorActions>['removeField'];
  toggleFieldIndex: ReturnType<typeof useEditorActions>['toggleFieldIndex'];
  fkOn: boolean;
  fkTitle: string;
  onToggleFk: () => void;
}) {
  const indexed = fieldIndexed(table, field.id);

  return (
    <div
      className={
        'field-editor__row field-editor__row--compact' +
        (selected ? ' field-editor__row--selected' : '') +
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
        title="Click to select · Shift / ⌘-click for many · drag to reorder"
        onClick={(e) => onSelect(field.id, e)}
        onDragStart={(e: DragEvent) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', field.id);
          onDragStart(field.id);
        }}
        onDragEnd={onDragEnd}
      >
        <Icon name="grip" size={16} />
      </div>
      <div className="field-editor__grid">
        <DraftInput
          className="input input--sm"
          value={field.name}
          placeholder="column_name"
          onChange={(v) => updateField(table.id, field.id, { name: v })}
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
          <Flag on={fkOn} label="FK" title={fkTitle} onClick={onToggleFk} />
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
          <Flag
            on={!!field.array}
            label="[ ]"
            title="Array type (e.g. text[])"
            onClick={() => updateField(table.id, field.id, { array: !field.array || undefined })}
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
        <DraftInput
          className="input input--sm"
          value={index.name}
          placeholder="index_name"
          onChange={(v) => updateIndex(table.id, index.id, { name: v })}
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
  /** Open the Add-relationship modal; `fieldId` pre-selects that column as the FK side. */
  onAddForeignKey?: (fieldId?: string) => void;
}) {
  const table = useTable(tableId);
  const tables = useTables();
  const rels = useRelationships();
  const {
    updateTable,
    addField,
    updateField,
    removeField,
    reorderFields,
    addIndex,
    updateIndex,
    removeIndex,
    toggleFieldIndex,
    deleteEntity,
  } = useEditorActions();
  const [section, setSection] = useState<Section>('columns');
  const [dragIds, setDragIds] = useState<Set<string>>(new Set());
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);
  const [recentColors, setRecentColors] = useState(getRecentColors);

  // Clear the column multi-selection when switching to a different table.
  useEffect(() => {
    setSelectedFields(new Set());
    anchorRef.current = null;
  }, [tableId]);

  if (!table) {
    return <div className="te-empty">This table no longer exists.</div>;
  }

  const endDrag = () => {
    setDragIds(new Set());
    setOverIndex(null);
  };

  // Click a column's grip to select it; Shift = range from the anchor, ⌘/Ctrl = toggle, plain = single.
  const selectField = (fieldId: string, e: MouseEvent) => {
    const ids = table.fields.map((f) => f.id);
    if (e.shiftKey && anchorRef.current) {
      const a = ids.indexOf(anchorRef.current);
      const b = ids.indexOf(fieldId);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelectedFields(new Set(ids.slice(lo, hi + 1)));
        return;
      }
    }
    if (e.metaKey || e.ctrlKey) {
      const next = new Set(selectedFields);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      setSelectedFields(next);
    } else {
      setSelectedFields(new Set([fieldId]));
    }
    anchorRef.current = fieldId;
  };

  // Begin a drag: move the whole selection if the grabbed column is part of a multi-selection,
  // otherwise just the grabbed column (and collapse the selection to it).
  const beginDrag = (fieldId: string) => {
    if (selectedFields.has(fieldId) && selectedFields.size > 1) {
      setDragIds(new Set(selectedFields));
    } else {
      setDragIds(new Set([fieldId]));
      setSelectedFields(new Set([fieldId]));
      anchorRef.current = fieldId;
    }
  };

  const dropOn = (toIndex: number) => {
    if (dragIds.size === 0) {
      endDrag();
      return;
    }
    const ids = table.fields.map((f) => f.id);
    const moving = ids.filter((id) => dragIds.has(id));
    const remaining = ids.filter((id) => !dragIds.has(id));
    const targetId = ids[toIndex];
    const insertAt =
      targetId == null
        ? remaining.length
        : dragIds.has(targetId)
          ? ids.slice(0, toIndex).filter((id) => !dragIds.has(id)).length
          : remaining.indexOf(targetId);
    const next = [...remaining.slice(0, insertAt), ...moving, ...remaining.slice(insertAt)];
    if (next.join(' ') !== ids.join(' ')) reorderFields(table.id, next);
    endDrag();
  };

  // Relationships where a column of this table is the child (FK) side, and a readable target label.
  const fieldFks = (fieldId: string): Relationship[] =>
    rels.filter((r) => r.fromTableId === table.id && r.fromFieldId === fieldId);
  const fkTarget = (r: Relationship): string => {
    const t = tables.find((x) => x.id === r.toTableId);
    return `${t?.name ?? '?'}.${t?.fields.find((x) => x.id === r.toFieldId)?.name ?? '?'}`;
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
            <DraftInput className="input input--sm" value={table.name} onChange={(v) => updateTable(table.id, { name: v })} />
          </label>
          <label className="te-label">
            Description
            <DraftTextarea
              className="te-textarea"
              value={table.comment ?? ''}
              placeholder="What is this table for? (purpose, owner, notes…)"
              rows={4}
              onChange={(v) => updateTable(table.id, { comment: v })}
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
            <Btn sm variant="ghost" icon="link" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={() => onAddForeignKey()}>
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
          <p className="te-hint">Click a handle to select; Shift / ⌘-click for several, then drag to reorder.</p>
          <div className="field-editor__list">
            {table.fields.map((f, i) => {
              const fks = fieldFks(f.id);
              return (
                <FieldRow
                  key={f.id}
                  table={table}
                  field={f}
                  index={i}
                  selected={selectedFields.has(f.id)}
                  dragging={dragIds.has(f.id)}
                  dropTarget={dragIds.size > 0 && overIndex === i && !dragIds.has(f.id)}
                  onSelect={selectField}
                  onDragStart={beginDrag}
                  onDragOver={setOverIndex}
                  onDrop={dropOn}
                  onDragEnd={endDrag}
                  updateField={updateField}
                  removeField={removeField}
                  toggleFieldIndex={toggleFieldIndex}
                  fkOn={fks.length > 0}
                  fkTitle={
                    fks.length > 0
                      ? `Foreign key → ${fks.map(fkTarget).join(', ')} — click to remove`
                      : 'Add foreign key — pick the referenced table'
                  }
                  onToggleFk={() => {
                    if (fks.length > 0) fks.forEach((r) => deleteEntity(r.id));
                    else onAddForeignKey?.(f.id);
                  }}
                />
              );
            })}
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
