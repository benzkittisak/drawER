/** PostgreSQL — SERIAL auto-increment, native CREATE TYPE … AS ENUM, schemas, JSONB. */
import type { DialectId, EnumType, Field } from '../../model/types';
import { BaseDialect } from './BaseDialect';
import type { AutoIncrementPlan, DialectCtx } from './Dialect';

export class PostgresDialect extends BaseDialect {
  readonly id: DialectId = 'postgres';

  supportsNamedEnum(): boolean {
    return true;
  }

  supportsArray(): boolean {
    return true;
  }

  renderAutoIncrement(field: Field): AutoIncrementPlan {
    if (field.type === 'int8') return { typeOverride: 'BIGSERIAL' };
    if (field.type === 'int2') return { typeOverride: 'SMALLSERIAL' };
    return { typeOverride: 'SERIAL' };
  }

  renderEnumPreamble(enums: EnumType[]): string[] {
    return enums.map(
      (e) =>
        `CREATE TYPE ${this.quoteIdent(e.name)} AS ENUM (${e.values
          .map((v) => this.quoteString(v))
          .join(', ')})${this.statementTerminator}`,
    );
  }

  protected columnSuffix(field: Field, _ctx: DialectCtx): string {
    // Postgres comments are separate COMMENT ON statements; omitted in M2 (see ticket).
    return field.comment ? ` /* ${field.comment.replace(/\*\//g, '*\\/')} */` : '';
  }
}
