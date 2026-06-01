/**
 * TableNode — a draggable ER table (strip + header + field rows), over the core model.
 * FK-ness is derived from relationships (a field that is the child side of any relationship),
 * passed in as `fkFieldIds`. `lockedBy` is the resolved presence user holding the table (real
 * awareness when shared, or the seed demo user when local) — the node decouples from any store.
 */
import type { MouseEvent } from 'react';
import type { Table } from '@core';
import { Icon } from '@ui/Icon';
import { Btn } from '@ui/atoms';
import { NODE_W } from './geometry';

export interface LockUser {
  name: string;
  color: string;
}

interface TableNodeProps {
  table: Table;
  selected: boolean;
  lockedBy?: LockUser;
  fkFieldIds: Set<string>;
  onSelect: (id: string) => void;
  onDragStart: (e: MouseEvent, id: string) => void;
  onGrip?: (e: MouseEvent, tableId: string, fieldId: string) => void;
}

export function TableNode({
  table,
  selected,
  lockedBy,
  fkFieldIds,
  onSelect,
  onDragStart,
  onGrip,
}: TableNodeProps) {
  return (
    <div
      className={'node' + (selected ? ' sel' : '') + (lockedBy ? ' locked' : '')}
      style={{ left: table.position.x, top: table.position.y, width: NODE_W }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(table.id);
      }}
    >
      {lockedBy && (
        <div className="node__badge-lock" style={{ background: lockedBy.color }}>
          <Icon name="lock" size={11} />
          {lockedBy.name.split(' ')[0]} editing
        </div>
      )}
      <div className="node__strip" style={{ background: table.color ?? 'var(--ink-4)' }} />
      <div
        className="node__head"
        onMouseDown={(e) => {
          if (lockedBy) return;
          e.stopPropagation();
          onSelect(table.id);
          onDragStart(e, table.id);
        }}
      >
        <Icon name="table" size={15} className="node__icon" />
        <div className="node__name">{table.name}</div>
        <div className="node__tools">
          <Btn iconOnly sm variant="ghost" icon="edit" title="Edit" />
          <Btn iconOnly sm variant="ghost" icon="more" title="More" />
        </div>
      </div>
      {table.fields.map((f) => {
        const fk = fkFieldIds.has(f.id);
        return (
          <div key={f.id} className="node__field" data-tid={table.id} data-fid={f.id}>
            <div
              className={'node__grip' + (fk ? ' fk' : '')}
              title="Drag to link"
              onMouseDown={(e) => {
                e.stopPropagation();
                onGrip?.(e, table.id, f.id);
              }}
            />
            {f.primary && <Icon name="key" size={13} className="node__key" />}
            <div className={'node__fname' + (f.primary ? ' pk' : '')}>{f.name}</div>
            <div className="node__ftype">
              {f.type}
              {!f.notNull && !f.primary ? '?' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
