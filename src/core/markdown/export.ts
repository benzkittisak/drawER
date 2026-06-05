/**
 * Markdown data-dictionary emitter — one-way export. Pure string builder.
 */
import type { Diagram, Table } from '../model/types';
import { CARDINALITY_LABEL } from '../model/types';

function tableSection(t: Table, fkFieldIds: Set<string>): string {
  const lines: string[] = [];
  lines.push(`### ${t.name}`);
  if (t.comment) lines.push('', t.comment);
  lines.push('', '| Column | Type | Key | Nullable | Default | Description |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const f of t.fields) {
    const key = [f.primary ? 'PK' : '', fkFieldIds.has(f.id) ? 'FK' : '', f.unique ? 'UQ' : '']
      .filter(Boolean)
      .join(', ');
    const type =
      (f.size != null ? `${f.type}(${f.size}${f.scale != null ? ',' + f.scale : ''})` : f.type) + (f.array ? '[]' : '');
    const nullable = f.notNull || f.primary ? 'No' : 'Yes';
    lines.push(
      `| ${f.name} | ${type} | ${key} | ${nullable} | ${f.default ?? ''} | ${f.comment ?? ''} |`,
    );
  }
  return lines.join('\n');
}

export function diagramToMarkdown(d: Diagram): string {
  const fkFieldIds = new Set(d.relationships.map((r) => r.fromFieldId));
  const out: string[] = [`# ${d.name}`, '', `_Database: ${d.dialect} · ${d.tables.length} tables_`, ''];
  out.push('## Tables', '');
  for (const t of d.tables) {
    out.push(tableSection(t, fkFieldIds), '');
  }
  if (d.relationships.length) {
    out.push('## Relationships', '');
    for (const r of d.relationships) {
      const from = d.tables.find((t) => t.id === r.fromTableId);
      const to = d.tables.find((t) => t.id === r.toTableId);
      const ff = from?.fields.find((f) => f.id === r.fromFieldId);
      const tf = to?.fields.find((f) => f.id === r.toFieldId);
      if (!from || !to) continue;
      out.push(
        `- \`${from.name}.${ff?.name}\` → \`${to.name}.${tf?.name}\` (${CARDINALITY_LABEL[r.cardinality]})`,
      );
    }
    out.push('');
  }
  return out.join('\n');
}
