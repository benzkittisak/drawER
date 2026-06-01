/** SQL export public surface — `exportSql(diagram, dialect, opts)` + the dialect registry. */
import type { Diagram, DialectId } from '../../model/types';
import { buildDDL } from './ddlBuilder';
import type { Dialect, ExportOptions } from './Dialect';
import { PostgresDialect } from './postgres';
import { MySqlDialect } from './mysql';
import { MariaDbDialect } from './mariadb';
import { SqliteDialect } from './sqlite';
import { MssqlDialect } from './mssql';
import { OracleDialect } from './oracle';

const REGISTRY: Record<DialectId, Dialect> = {
  postgres: new PostgresDialect(),
  mysql: new MySqlDialect(),
  mariadb: new MariaDbDialect(),
  sqlite: new SqliteDialect(),
  mssql: new MssqlDialect(),
  oracle: new OracleDialect(),
};

export const DIALECT_LABELS: Record<DialectId, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
  mssql: 'SQL Server',
  oracle: 'Oracle',
};

export function getDialect(id: DialectId): Dialect {
  return REGISTRY[id];
}

export function exportSql(diagram: Diagram, dialect: DialectId, opts?: ExportOptions): string {
  return buildDDL(diagram, REGISTRY[dialect], opts);
}

export type { ExportOptions } from './Dialect';
export type { Dialect } from './Dialect';
