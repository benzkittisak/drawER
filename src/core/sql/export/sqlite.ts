/**
 * SQLite — type affinity, no native enum (CHECK), and the special-case
 * `INTEGER PRIMARY KEY AUTOINCREMENT` which must be declared inline on the column.
 */
import type { DialectId, Field, Table } from '../../model/types';
import { BaseDialect } from './BaseDialect';
import type { DialectCtx } from './Dialect';

export class SqliteDialect extends BaseDialect {
  readonly id: DialectId = 'sqlite';

  supportsSchemas(): boolean {
    return false;
  }

  private soleAutoPk(table: Table): Field | undefined {
    const pks = table.fields.filter((f) => f.primary);
    return pks.length === 1 && pks[0].autoIncrement ? pks[0] : undefined;
  }

  renderColumn(field: Field, table: Table, ctx: DialectCtx): string {
    if (this.soleAutoPk(table) === field) {
      return `${this.quoteIdent(field.name)} INTEGER PRIMARY KEY AUTOINCREMENT`;
    }
    return super.renderColumn(field, table, ctx);
  }

  renderPrimaryKey(table: Table, ctx: DialectCtx): string | null {
    if (this.soleAutoPk(table)) return null; // declared inline on the column
    return super.renderPrimaryKey(table, ctx);
  }
}
