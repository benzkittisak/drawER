/**
 * TableNode — a draggable ER table (strip + header + field rows), over the core model.
 * FK-ness is derived from relationships (`fkFieldIds`). `lockedBy` is the resolved presence user
 * holding the table. The node is wrapped so the "editing" lock badge can sit above it without
 * being clipped by the node's `overflow: hidden` (which rounds the corners + strip).
 */
import { memo, type MouseEvent } from 'react';
import type { Table } from '@core';
import { Icon } from '@ui/Icon';
import { FIELD, NODE_W } from './geometry';

export interface LockUser {
  name: string;
  color: string;
}

interface TableNodeProps {
  table: Table;
  position: { x: number; y: number };
  dragging?: boolean;
  selected: boolean;
  lockedBy?: LockUser;
  fkFieldIds: Set<string>;
  onSelect: (id: string) => void;
  onDragStart: (e: MouseEvent, id: string) => void;
  onGrip?: (e: MouseEvent, tableId: string, fieldId: string) => void;
  readonly?: boolean;
  /** Level-of-detail: when zoomed far out, collapse field rows to a single placeholder of the
   *  SAME height — cuts thousands of DOM nodes on big diagrams while keeping edge geometry exact. */
  compact?: boolean;
}

export const TableNode = memo(function TableNode({
  table,
  position,
  dragging,
  selected,
  lockedBy,
  fkFieldIds,
  onSelect,
  onDragStart,
  onGrip,
  readonly = false,
  compact = false,
}: TableNodeProps) {
  return (
    <div
      className={
        'node-wrap' +
        (dragging ? ' node-wrap--dragging' : '') +
        (lockedBy ? ' node-wrap--locked' : '')
      }
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: NODE_W,
        zIndex: dragging ? 30 : lockedBy ? 25 : selected ? 10 : undefined,
      }}
    >
      {lockedBy && (
        <div className="node__badge-lock" style={{ background: lockedBy.color }}>
          <Icon name="lock" size={11} />
          {lockedBy.name.split(' ')[0]} editing
        </div>
      )}
      <div
        className={'node' + (selected ? ' sel' : '') + (lockedBy ? ' locked' : '')}
        style={{ position: 'relative', left: 0, top: 0, width: NODE_W }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          onSelect(table.id);
        }}
      >
        <div className="node__strip" style={{ background: table.color ?? 'var(--ink-4)' }} />
        <div
          className="node__head"
          title={table.comment?.trim() || undefined}
          onMouseDown={(e) => {
            if (readonly || lockedBy) return;
            if (e.button !== 0) return;
            e.stopPropagation();
            onSelect(table.id);
            onDragStart(e, table.id);
          }}
        >
          <Icon name="table" size={15} className="node__icon" />
          <div className="node__head-text">
            <div className="node__name">{table.name}</div>
            {table.comment?.trim() ? <div className="node__comment">{table.comment.trim()}</div> : null}
          </div>
          {table.comment?.trim() ? <Icon name="comment" size={13} className="node__comment-icon" aria-hidden /> : null}
        </div>
        {compact ? (
          <div className="node__lod" style={{ height: table.fields.length * FIELD }} aria-hidden>
            {table.fields.length} {table.fields.length === 1 ? 'field' : 'fields'}
          </div>
        ) : (
          table.fields.map((f) => {
          const fk = fkFieldIds.has(f.id);
          return (
            <div key={f.id} className="node__field" data-tid={table.id} data-fid={f.id}>
              {!readonly && (
                <div
                  className={'node__grip' + (fk ? ' fk' : '')}
                  title="Drag to link"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onGrip?.(e, table.id, f.id);
                  }}
                />
              )}
              {f.primary && <Icon name="key" size={13} className="node__key" />}
              {fk && <Icon name="link" size={13} className="node__fk" />}
              <div className={'node__fname' + (fk ? ' fk' : '') + (f.primary ? ' pk' : '')}>
                {f.name}
              </div>
              <div className="node__ftype">
                {f.type}
                {f.array ? '[]' : ''}
                {!f.notNull && !f.primary ? '?' : ''}
              </div>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
});
