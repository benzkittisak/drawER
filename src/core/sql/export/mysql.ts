/** MySQL — backtick quoting, AUTO_INCREMENT, inline ENUM, ENGINE=InnoDB, inline comments. */
import type { DialectId, Field, Table } from '../../model/types';
import { BaseDialect } from './BaseDialect';
import type { AutoIncrementPlan, DialectCtx } from './Dialect';

export class MySqlDialect extends BaseDialect {
  readonly id: DialectId = 'mysql';

  quoteIdent(name: string): string {
    return '`' + name.replace(/`/g, '``') + '`';
  }

  supportsInlineEnum(): boolean {
    return true;
  }
  supportsSchemas(): boolean {
    return false;
  }

  renderAutoIncrement(_field: Field): AutoIncrementPlan {
    return { inlineClause: 'AUTO_INCREMENT' };
  }

  protected tableSuffix(_table: Table): string {
    return ' ENGINE=InnoDB';
  }

  protected columnSuffix(field: Field, _ctx: DialectCtx): string {
    return field.comment ? ` COMMENT ${this.quoteString(field.comment)}` : '';
  }
}
