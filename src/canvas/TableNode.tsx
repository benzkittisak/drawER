/**
 * TableNode — a draggable ER table (strip + header + field rows), over the core model.
 * FK-ness is derived from relationships (a field that is the child side of any relationship),
 * passed in as `fkFieldIds`. Lock chrome is driven by the (still-mocked) collab `users`/`lockedBy`.
 */
import type { MouseEvent } from 'react';
import type { Table } from '@core';
import type { DemoUser } from '@data/types';
import { Icon } from '@ui/Icon';
import { Btn } from '@ui/atoms';
import { NODE_W } from './geometry';

interface TableNodeProps {
  table: Table;
  selected: boolean;
  lockedBy?: string;
  users: Record<string, DemoUser>;
  fkFieldIds: Set<string>;
  onSelect: (id: string) => void;
  onDragStart: (e: MouseEvent, id: string) => void;
  onGrip?: (e: MouseEvent, tableId: string, fieldId: string) => void;
}

export function TableNode({
  table,
  selected,
  lockedBy,
  users,
  fkFieldIds,
  onSelect,
  onDragStart,
  onGrip,
}: TableNodeProps) {
  const locker = lockedBy ? users[lockedBy] : undefined;
  return (
    <div
      className={'node' + (selected ? ' sel' : '') + (lockedBy ? ' locked' : '')}
      style={{ left: table.position.x, top: table.position.y, width: NODE_W }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(table.id);
      }}
    >
      {locker && (
        <div className="node__badge-lock" style={{ background: locker.color }}>
          <Icon name="lock" size={11} />
          {locker.name.split(' ')[0]} editing
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
