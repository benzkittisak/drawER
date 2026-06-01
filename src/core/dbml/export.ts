/**
 * DBML emitter (our model → DBML). Pure string builder — full control, no @dbml/core needed
 * for export. https://dbml.dbdiagram.io/docs
 */
import type { Cardinality, Diagram, EnumType, Field } from '../model/types';

function refOp(card: Cardinality): string {
  switch (card) {
    case 'one_to_one':
      return '-';
    case 'one_to_many':
      return '<';
    case 'many_to_one':
      return '>';
    case 'many_to_many':
      return '<>';
  }
}

function fieldType(d: Diagram, f: Field): string {
  const named = d.enums.find((e) => e.id === f.customTypeId || e.name === f.type);
  if (named) return named.name;
  if (f.size != null) return `${f.type}(${f.size}${f.scale != null ? ',' + f.scale : ''})`;
  return f.type;
}

function fieldSettings(f: Field): string {
  const s: string[] = [];
  if (f.primary) s.push('pk');
  if (f.autoIncrement) s.push('increment');
  if (f.notNull && !f.primary) s.push('not null');
  if (f.unique && !f.primary) s.push('unique');
  if (f.default != null && f.default !== '') {
    const d = f.default;
    const val = /^'.*'$/.test(d) || /^-?\d/.test(d) ? d : '`' + d + '`';
    s.push(`default: ${val}`);
  }
  if (f.comment) s.push(`note: '${f.comment.replace(/'/g, "\\'")}'`);
  return s.length ? ` [${s.join(', ')}]` : '';
}

function enumBlock(e: EnumType): string {
  return `Enum ${e.name} {\n${e.values.map((v) => `  ${v}`).join('\n')}\n}`;
}

export function diagramToDbml(d: Diagram): string {
  const out: string[] = [];
  for (const e of d.enums) out.push(enumBlock(e));

  for (const t of d.tables) {
    const lines = t.fields.map((f) => `  ${f.name} ${fieldType(d, f)}${fieldSettings(f)}`);
    out.push(`Table ${t.name} {\n${lines.join('\n')}\n}`);
  }

  for (const r of d.relationships) {
    const from = d.tables.find((t) => t.id === r.fromTableId);
    const to = d.tables.find((t) => t.id === r.toTableId);
    const ff = from?.fields.find((f) => f.id === r.fromFieldId);
    const tf = to?.fields.find((f) => f.id === r.toFieldId);
    if (!from || !to || !ff || !tf) continue;
    out.push(`Ref ${r.name}: ${from.name}.${ff.name} ${refOp(r.cardinality)} ${to.name}.${tf.name}`);
  }

  return out.join('\n\n') + '\n';
}
