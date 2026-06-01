/** Microsoft SQL Server — [bracket] quoting, IDENTITY(1,1), GO batch separator, NVARCHAR. */
import type { DialectId, Field } from '../../model/types';
import { BaseDialect } from './BaseDialect';
import type { AutoIncrementPlan } from './Dialect';

export class MssqlDialect extends BaseDialect {
  readonly id: DialectId = 'mssql';
  readonly batchSeparator = 'GO';

  protected autoIncrementPosition: 'afterType' | 'afterConstraints' = 'afterType';

  quoteIdent(name: string): string {
    return '[' + name.replace(/]/g, ']]') + ']';
  }

  renderAutoIncrement(_field: Field): AutoIncrementPlan {
    return { inlineClause: 'IDENTITY(1,1)' };
  }
}
