/**
 * Mermaid ER diagram emitter — one-way export. Pure string builder.
 * https://mermaid.js.org/syntax/entityRelationshipDiagram.html
 */
import type { Cardinality, Diagram, Table } from '../model/types';

// Rendered as `<to> <notation> <from>` (parent on the left, child on the right).
// Mermaid: || = exactly one, o{ = zero-or-many.
function relationNotation(card: Cardinality): string {
  switch (card) {
    case 'one_to_one':
      return '||--||';
    case 'many_to_one': // from = many, to = one
      return '||--o{';
    case 'one_to_many': // from = one, to = many
      return '}o--||';
    case 'many_to_many':
      return '}o--o{';
  }
}

const ident = (name: string): string => name.replace(/[^A-Za-z0-9_]/g, '_');

function columnLine(table: Table, fieldId: string, pkFieldIds: Set<string>, fkFieldIds: Set<string>): string {
  const f = table.fields.find((x) => x.id === fieldId);
  if (!f) return '';
  const keys = [pkFieldIds.has(f.id) ? 'PK' : '', fkFieldIds.has(f.id) ? 'FK' : ''].filter(Boolean).join(',');
  const type = ident(f.type);
  return `    ${type} ${ident(f.name)}${keys ? ' ' + keys : ''}`;
}

export function diagramToMermaid(d: Diagram): string {
  const fkFieldIds = new Set(d.relationships.map((r) => r.fromFieldId));
  const lines: string[] = ['erDiagram'];

  for (const t of d.tables) {
    const pkFieldIds = new Set(t.fields.filter((f) => f.primary).map((f) => f.id));
    lines.push(`  ${ident(t.name)} {`);
    for (const f of t.fields) lines.push(columnLine(t, f.id, pkFieldIds, fkFieldIds));
    lines.push('  }');
  }

  for (const r of d.relationships) {
    const from = d.tables.find((t) => t.id === r.fromTableId);
    const to = d.tables.find((t) => t.id === r.toTableId);
    if (!from || !to) continue;
    const label = ident(r.name || 'fk');
    lines.push(`  ${ident(to.name)} ${relationNotation(r.cardinality)} ${ident(from.name)} : ${label}`);
  }

  return lines.join('\n') + '\n';
}
