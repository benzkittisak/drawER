/** Reverse type mapping: a SQL/DBML type name → canonical catalog key (best-effort). */
const GENERIC: Record<string, string> = {
  INT: 'int4', INTEGER: 'int4', INT4: 'int4', MEDIUMINT: 'int4',
  SMALLINT: 'int2', INT2: 'int2', TINYINT: 'int2',
  BIGINT: 'int8', INT8: 'int8',
  DECIMAL: 'numeric', NUMERIC: 'numeric', NUMBER: 'numeric',
  REAL: 'float4', FLOAT4: 'float4',
  DOUBLE: 'float8', 'DOUBLE PRECISION': 'float8', FLOAT: 'float8', FLOAT8: 'float8', BINARY_DOUBLE: 'float8',
  BOOL: 'boolean', BOOLEAN: 'boolean', BIT: 'boolean',
  VARCHAR: 'varchar', VARCHAR2: 'varchar', 'CHARACTER VARYING': 'varchar', NVARCHAR: 'varchar',
  CHAR: 'char', NCHAR: 'char', BPCHAR: 'char', CHARACTER: 'char',
  TEXT: 'text', CLOB: 'text', LONGTEXT: 'text', MEDIUMTEXT: 'text',
  UUID: 'uuid', UNIQUEIDENTIFIER: 'uuid',
  TIMESTAMP: 'timestamp', DATETIME: 'timestamp', DATETIME2: 'timestamp',
  TIMESTAMPTZ: 'timestamptz', DATETIMEOFFSET: 'timestamptz',
  DATE: 'date', TIME: 'time',
  JSON: 'json', JSONB: 'jsonb',
  BLOB: 'blob', BYTEA: 'blob', VARBINARY: 'blob',
  ENUM: 'enum',
};

export function reverseType(raw: string): { key: string; autoIncrement: boolean; array?: boolean } {
  let u = raw.toUpperCase().trim();
  // Detect (and strip) an array suffix, e.g. `TEXT[]` / `INT4[]`.
  const array = u.endsWith('[]') ? true : undefined;
  if (array) u = u.slice(0, -2).trim();
  if (u === 'SERIAL') return { key: 'int4', autoIncrement: true, array };
  if (u === 'BIGSERIAL') return { key: 'int8', autoIncrement: true, array };
  if (u === 'SMALLSERIAL') return { key: 'int2', autoIncrement: true, array };
  const base = u.split('(')[0].trim();
  return { key: GENERIC[u] ?? GENERIC[base] ?? base.toLowerCase(), autoIncrement: false, array };
}
