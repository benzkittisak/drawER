/**
 * SQL export — dialect-strategy contract. `exportSql` (ddlBuilder) walks the model and
 * delegates every dialect-specific decision to a `Dialect`. Adding a database = one new
 * Dialect implementation, no builder changes. All SQL is encoded from vendor manuals
 * (clean-room — ADR 0003), never from drawdb.
 */
import type { Diagram, DialectId, EnumType, Field, Index, Relationship, Table } from '../../model/types';

export interface ExportOptions {
  /** Emit `IF NOT EXISTS` on CREATE TABLE. */
  ifNotExists?: boolean;
  /** Emit column/table comments where supported. */
  includeComments?: boolean;
  /** Place FK constraints inside CREATE TABLE instead of trailing ALTER TABLE. */
  inlineForeignKeys?: boolean;
  /** Qualify table names with their schema. */
  schemaQualified?: boolean;
}

export type ResolvedExportOptions = Required<ExportOptions>;

export const DEFAULT_OPTIONS: ResolvedExportOptions = {
  ifNotExists: false,
  includeComments: true,
  inlineForeignKeys: false,
  schemaQualified: false,
};

/** How a dialect expresses auto-increment for a column. */
export interface AutoIncrementPlan {
  /** Replace the column's type entirely (e.g. Postgres SERIAL/BIGSERIAL). */
  typeOverride?: string;
  /** Clause appended after the type/constraints (e.g. AUTO_INCREMENT, IDENTITY(1,1)). */
  inlineClause?: string;
}

/** Lookups + options threaded through render methods. */
export interface DialectCtx {
  diagram: Diagram;
  options: ResolvedExportOptions;
  /** Resolve the named enum a field refers to (via customTypeId or by type-name), if any. */
  enumFor(field: Field): EnumType | undefined;
}

export interface Dialect {
  readonly id: DialectId;
  readonly statementTerminator: string;
  /** Separates statement batches (e.g. MSSQL "GO"); empty if none. */
  readonly batchSeparator: string;

  quoteIdent(name: string): string;
  quoteString(value: string): string;

  qualifiedName(table: Table, ctx: DialectCtx): string;
  renderType(field: Field, ctx: DialectCtx): string;
  renderAutoIncrement(field: Field, ctx: DialectCtx): AutoIncrementPlan;
  renderColumn(field: Field, table: Table, ctx: DialectCtx): string;
  renderColumnCheck(field: Field, ctx: DialectCtx): string | null;
  renderPrimaryKey(table: Table, ctx: DialectCtx): string | null;
  renderForeignKey(rel: Relationship, ctx: DialectCtx): string;
  renderIndex(index: Index, table: Table, ctx: DialectCtx): string;
  renderCreateTable(table: Table, ctx: DialectCtx): string;
  renderEnumPreamble(enums: EnumType[], ctx: DialectCtx): string[];

  supportsInlineEnum(): boolean;
  /** True when the dialect has first-class named enum types (e.g. Postgres CREATE TYPE). */
  supportsNamedEnum(): boolean;
  supportsSchemas(): boolean;
}
