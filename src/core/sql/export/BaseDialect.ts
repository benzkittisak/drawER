/**
 * BaseDialect — ANSI-ish defaults. Concrete dialects extend this and override only their
 * deltas. Catalog-driven type rendering; enum handling degrades gracefully (named type →
 * inline ENUM → VARCHAR + CHECK) based on dialect capability flags.
 */
import { CATALOGS } from '../../catalog';
import type {
  Diagram,
  DialectId,
  EnumType,
  Field,
  Index,
  Relationship,
  Table,
} from '../../model/types';
import type { AutoIncrementPlan, Dialect, DialectCtx } from './Dialect';

export abstract class BaseDialect implements Dialect {
  abstract readonly id: DialectId;
  readonly statementTerminator: string = ';';
  readonly batchSeparator: string = '';

  /** Where the auto-increment inline clause goes relative to NOT NULL/DEFAULT. */
  protected autoIncrementPosition: 'afterType' | 'afterConstraints' = 'afterConstraints';

  // ---- identifiers / literals (ANSI defaults) ----
  quoteIdent(name: string): string {
    return '"' + name.replace(/"/g, '""') + '"';
  }
  quoteString(value: string): string {
    return "'" + value.replace(/'/g, "''") + "'";
  }

  qualifiedName(table: Table, ctx: DialectCtx): string {
    if (ctx.options.schemaQualified && table.schema) {
      return this.quoteIdent(table.schema) + '.' + this.quoteIdent(table.name);
    }
    return this.quoteIdent(table.name);
  }

  // ---- capability flags ----
  supportsInlineEnum(): boolean {
    return false;
  }
  supportsNamedEnum(): boolean {
    return false;
  }
  supportsSchemas(): boolean {
    return true;
  }

  /** Fallback string type for enums when the dialect lacks enum support. */
  protected stringType(): string {
    return this.catalogName('varchar') + '(255)';
  }
  protected catalogName(key: string): string {
    return CATALOGS[this.id][key]?.name ?? key.toUpperCase();
  }

  protected enumValues(field: Field, ctx: DialectCtx): string[] {
    const named = ctx.enumFor(field);
    if (named) return named.values;
    if (field.type === 'enum') return field.values ?? [];
    return [];
  }

  renderType(field: Field, ctx: DialectCtx): string {
    const named = ctx.enumFor(field);
    if (named) {
      if (this.supportsNamedEnum()) return this.quoteIdent(named.name);
      if (this.supportsInlineEnum() && named.values.length)
        return `ENUM(${named.values.map((v) => this.quoteString(v)).join(', ')})`;
      return this.stringType();
    }
    if (field.type === 'enum') {
      const vals = field.values ?? [];
      if (this.supportsInlineEnum() && vals.length)
        return `ENUM(${vals.map((v) => this.quoteString(v)).join(', ')})`;
      return this.stringType();
    }
    const def = CATALOGS[this.id][field.type];
    let name = def?.name ?? field.type.toUpperCase();
    if (def?.hasSize && field.size != null) {
      name +=
        def.hasScale && field.scale != null ? `(${field.size},${field.scale})` : `(${field.size})`;
    }
    return name;
  }

  renderAutoIncrement(_field: Field, _ctx: DialectCtx): AutoIncrementPlan {
    return {};
  }

  /** Inline trailing bits per column (e.g. MySQL COMMENT '...'). */
  protected columnSuffix(_field: Field, _ctx: DialectCtx): string {
    return '';
  }

  renderColumnCheck(field: Field, ctx: DialectCtx): string | null {
    const vals = this.enumValues(field, ctx);
    if (vals.length && !this.supportsInlineEnum() && !this.supportsNamedEnum()) {
      const list = vals.map((v) => this.quoteString(v)).join(', ');
      return `CHECK (${this.quoteIdent(field.name)} IN (${list}))`;
    }
    return null;
  }

  renderColumn(field: Field, _table: Table, ctx: DialectCtx): string {
    const plan = field.autoIncrement ? this.renderAutoIncrement(field, ctx) : {};
    const parts: string[] = [this.quoteIdent(field.name), plan.typeOverride ?? this.renderType(field, ctx)];

    if (this.autoIncrementPosition === 'afterType' && plan.inlineClause) parts.push(plan.inlineClause);
    if (field.notNull || field.primary) parts.push('NOT NULL');
    if (field.default != null && field.default !== '') parts.push('DEFAULT ' + field.default);
    if (field.unique && !field.primary) parts.push('UNIQUE');
    if (this.autoIncrementPosition === 'afterConstraints' && plan.inlineClause) parts.push(plan.inlineClause);

    const check = this.renderColumnCheck(field, ctx);
    if (check) parts.push(check);

    const suffix = ctx.options.includeComments ? this.columnSuffix(field, ctx) : '';
    return parts.join(' ') + suffix;
  }

  renderPrimaryKey(table: Table, _ctx: DialectCtx): string | null {
    const pks = table.fields.filter((f) => f.primary);
    if (!pks.length) return null;
    return `PRIMARY KEY (${pks.map((f) => this.quoteIdent(f.name)).join(', ')})`;
  }

  renderForeignKey(rel: Relationship, ctx: DialectCtx): string {
    const child = tableById(ctx.diagram, rel.fromTableId);
    const parent = tableById(ctx.diagram, rel.toTableId);
    const childCol = fieldById(child, rel.fromFieldId);
    const parentCol = fieldById(parent, rel.toFieldId);
    if (!child || !parent || !childCol || !parentCol) return '';
    let s = `CONSTRAINT ${this.quoteIdent(rel.name)} FOREIGN KEY (${this.quoteIdent(childCol.name)}) REFERENCES ${this.qualifiedName(parent, ctx)} (${this.quoteIdent(parentCol.name)})`;
    if (rel.onDelete !== 'NO ACTION') s += ` ON DELETE ${rel.onDelete}`;
    if (rel.onUpdate !== 'NO ACTION') s += ` ON UPDATE ${rel.onUpdate}`;
    return s;
  }

  renderIndex(index: Index, table: Table, ctx: DialectCtx): string {
    const cols = index.fieldIds
      .map((fid) => fieldById(table, fid))
      .filter(Boolean)
      .map((f) => this.quoteIdent(f!.name))
      .join(', ');
    return `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${this.quoteIdent(index.name)} ON ${this.qualifiedName(table, ctx)} (${cols})${this.statementTerminator}`;
  }

  /** Suffix after the closing paren of CREATE TABLE (e.g. MySQL ENGINE=InnoDB). */
  protected tableSuffix(_table: Table): string {
    return '';
  }

  renderCreateTable(table: Table, ctx: DialectCtx): string {
    const lines = table.fields.map((f) => '  ' + this.renderColumn(f, table, ctx));
    const pk = this.renderPrimaryKey(table, ctx);
    if (pk) lines.push('  ' + pk);
    if (ctx.options.inlineForeignKeys) {
      for (const rel of ctx.diagram.relationships) {
        if (rel.fromTableId === table.id) {
          const fk = this.renderForeignKey(rel, ctx);
          if (fk) lines.push('  ' + fk);
        }
      }
    }
    const ifNotExists = ctx.options.ifNotExists ? 'IF NOT EXISTS ' : '';
    return (
      `CREATE TABLE ${ifNotExists}${this.qualifiedName(table, ctx)} (\n` +
      lines.join(',\n') +
      `\n)${this.tableSuffix(table)}${this.statementTerminator}`
    );
  }

  renderEnumPreamble(_enums: EnumType[], _ctx: DialectCtx): string[] {
    return [];
  }
}

export function tableById(diagram: Diagram, id: string): Table | undefined {
  return diagram.tables.find((t) => t.id === id);
}
export function fieldById(table: Table | undefined, fieldId: string): Field | undefined {
  return table?.fields.find((f) => f.id === fieldId);
}
