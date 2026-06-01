/**
 * RelationshipList — shared FK list for left Relations tab and right Link tab.
 */
import type { Relationship, Table } from '@core';
import { CARDINALITY_LABEL, relationshipsForTable } from '@core';

const MAX_REL_SEARCH = 200;

function filterRelsByQuery(rels: Relationship[], byId: Record<string, Table>, query: string): Relationship[] {
  const q = query.trim().toLowerCase();
  if (!q) return rels;
  return rels.filter((r) => {
    const a = byId[r.fromTableId];
    const b = byId[r.toTableId];
    if (!a || !b) return false;
    return a.name.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
  });
}

export interface RelationshipListProps {
  rels: Relationship[];
  tables: Table[];
  tableId?: string | null;
  tableName?: string;
  selectedRel: string | null;
  onSelectRel: (id: string) => void;
  searchQuery?: string;
}

export function RelationshipList({
  rels,
  tables,
  tableId,
  tableName,
  selectedRel,
  onSelectRel,
  searchQuery = '',
}: RelationshipListProps) {
  const byId = Object.fromEntries(tables.map((t) => [t.id, t]));
  let list = tableId ? relationshipsForTable(rels, tableId) : rels;
  list = filterRelsByQuery(list, byId, searchQuery).slice(0, MAX_REL_SEARCH);

  if (list.length === 0) {
    return (
      <div style={{ padding: '12px 10px', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.55 }}>
        {tableId && tableName ? (
          <>
            No foreign keys for <b>{tableName}</b>. Use <b>Add</b> above or drag from a field grip on the canvas.
          </>
        ) : rels.length === 0 ? (
          <>
            No relationships yet. Use <b>Add</b> above, or drag from a field grip on the canvas.
          </>
        ) : (
          <>No relationships match your search.</>
        )}
      </div>
    );
  }

  return (
    <>
      {tableId && tableName && (
        <div className="rel-list__scope">
          Relations for <b>{tableName}</b>
        </div>
      )}
      {list.map((r) => {
        const a = byId[r.fromTableId];
        const b = byId[r.toTableId];
        if (!a || !b) return null;
        const af = a.fields.find((f) => f.id === r.fromFieldId);
        const bf = b.fields.find((f) => f.id === r.toFieldId);
        return (
          <div
            key={r.id}
            className={'rl' + (selectedRel === r.id ? ' active' : '')}
            onClick={() => onSelectRel(r.id)}
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
    </>
  );
}
