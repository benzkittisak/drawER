/**
 * ddlBuilder — orchestrates a full DDL script from a Diagram + Dialect.
 * Order: enum/type preambles → CREATE TABLE → indices → (trailing) foreign keys.
 */
import type { Diagram, EnumType, Field } from '../../model/types';
import { DEFAULT_OPTIONS, type Dialect, type DialectCtx, type ExportOptions } from './Dialect';
import { fieldById, tableById } from './BaseDialect';

export function buildDDL(diagram: Diagram, dialect: Dialect, opts: ExportOptions = {}): string {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const ctx: DialectCtx = {
    diagram,
    options,
    enumFor: (field: Field): EnumType | undefined =>
      diagram.enums.find((e) => e.id === field.customTypeId || e.name === field.type),
  };

  const statements: string[] = [];

  // 1. enum / named-type preambles
  statements.push(...dialect.renderEnumPreamble(diagram.enums, ctx));

  // 2. tables
  for (const table of diagram.tables) {
    statements.push(dialect.renderCreateTable(table, ctx));
  }

  // 3. indices
  for (const table of diagram.tables) {
    for (const index of table.indices) {
      statements.push(dialect.renderIndex(index, table, ctx));
    }
  }

  // 4. trailing foreign keys (unless inlined into CREATE TABLE)
  if (!options.inlineForeignKeys) {
    for (const rel of diagram.relationships) {
      const child = tableById(diagram, rel.fromTableId);
      if (!child) continue;
      // skip if the referenced columns can't be resolved
      if (!fieldById(child, rel.fromFieldId)) continue;
      const constraint = dialect.renderForeignKey(rel, ctx);
      if (!constraint) continue;
      statements.push(
        `ALTER TABLE ${dialect.qualifiedName(child, ctx)} ADD ${constraint}${dialect.statementTerminator}`,
      );
    }
  }

  const sep = dialect.batchSeparator ? `\n${dialect.batchSeparator}\n` : '\n\n';
  return statements.join(sep) + '\n';
}
