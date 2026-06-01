/**
 * Per-dialect type catalogs. Canonical type keys (dialect-agnostic, used in the model's
 * Field.type) map to a per-dialect SQL type name + capability metadata. The SQL engine
 * (M2) and UI type pickers are catalog-driven, so adding/adjusting a type is data, not code.
 *
 * SQL names are encoded from vendor manuals (clean-room — see ADR 0003), not from drawdb.
 */
import type { DialectId } from '../model/types';

export type TypeCategory =
  | 'numeric'
  | 'string'
  | 'datetime'
  | 'boolean'
  | 'binary'
  | 'json'
  | 'uuid'
  | 'other';

export interface TypeDef {
  /** Canonical key stored in Field.type. */
  key: string;
  /** SQL type name for this dialect. */
  name: string;
  category: TypeCategory;
  hasSize?: boolean;
  hasScale?: boolean;
  defaultSize?: number;
}

export type TypeCatalog = Record<string, TypeDef>;

/** Canonical type metadata, shared across dialects. */
const CANON: Record<string, Omit<TypeDef, 'key' | 'name'>> = {
  uuid: { category: 'uuid' },
  varchar: { category: 'string', hasSize: true, defaultSize: 255 },
  char: { category: 'string', hasSize: true, defaultSize: 1 },
  text: { category: 'string' },
  int2: { category: 'numeric' },
  int4: { category: 'numeric' },
  int8: { category: 'numeric' },
  numeric: { category: 'numeric', hasSize: true, hasScale: true },
  float4: { category: 'numeric' },
  float8: { category: 'numeric' },
  boolean: { category: 'boolean' },
  date: { category: 'datetime' },
  time: { category: 'datetime' },
  timestamp: { category: 'datetime' },
  timestamptz: { category: 'datetime' },
  json: { category: 'json' },
  jsonb: { category: 'json' },
  enum: { category: 'other' },
  blob: { category: 'binary' },
};

/** Per-dialect SQL names for each canonical key. */
const SQL_NAMES: Record<DialectId, Record<string, string>> = {
  postgres: {
    uuid: 'UUID', varchar: 'VARCHAR', char: 'CHAR', text: 'TEXT',
    int2: 'SMALLINT', int4: 'INTEGER', int8: 'BIGINT', numeric: 'NUMERIC',
    float4: 'REAL', float8: 'DOUBLE PRECISION', boolean: 'BOOLEAN',
    date: 'DATE', time: 'TIME', timestamp: 'TIMESTAMP', timestamptz: 'TIMESTAMPTZ',
    json: 'JSON', jsonb: 'JSONB', enum: 'ENUM', blob: 'BYTEA',
  },
  mysql: {
    uuid: 'CHAR(36)', varchar: 'VARCHAR', char: 'CHAR', text: 'TEXT',
    int2: 'SMALLINT', int4: 'INT', int8: 'BIGINT', numeric: 'DECIMAL',
    float4: 'FLOAT', float8: 'DOUBLE', boolean: 'TINYINT(1)',
    date: 'DATE', time: 'TIME', timestamp: 'TIMESTAMP', timestamptz: 'TIMESTAMP',
    json: 'JSON', jsonb: 'JSON', enum: 'ENUM', blob: 'BLOB',
  },
  mariadb: {
    uuid: 'UUID', varchar: 'VARCHAR', char: 'CHAR', text: 'TEXT',
    int2: 'SMALLINT', int4: 'INT', int8: 'BIGINT', numeric: 'DECIMAL',
    float4: 'FLOAT', float8: 'DOUBLE', boolean: 'TINYINT(1)',
    date: 'DATE', time: 'TIME', timestamp: 'TIMESTAMP', timestamptz: 'TIMESTAMP',
    json: 'JSON', jsonb: 'JSON', enum: 'ENUM', blob: 'BLOB',
  },
  sqlite: {
    uuid: 'TEXT', varchar: 'TEXT', char: 'TEXT', text: 'TEXT',
    int2: 'INTEGER', int4: 'INTEGER', int8: 'INTEGER', numeric: 'NUMERIC',
    float4: 'REAL', float8: 'REAL', boolean: 'INTEGER',
    date: 'TEXT', time: 'TEXT', timestamp: 'TEXT', timestamptz: 'TEXT',
    json: 'TEXT', jsonb: 'TEXT', enum: 'TEXT', blob: 'BLOB',
  },
  mssql: {
    uuid: 'UNIQUEIDENTIFIER', varchar: 'NVARCHAR', char: 'NCHAR', text: 'NVARCHAR(MAX)',
    int2: 'SMALLINT', int4: 'INT', int8: 'BIGINT', numeric: 'DECIMAL',
    float4: 'REAL', float8: 'FLOAT', boolean: 'BIT',
    date: 'DATE', time: 'TIME', timestamp: 'DATETIME2', timestamptz: 'DATETIMEOFFSET',
    json: 'NVARCHAR(MAX)', jsonb: 'NVARCHAR(MAX)', enum: 'NVARCHAR(255)', blob: 'VARBINARY(MAX)',
  },
  oracle: {
    uuid: 'VARCHAR2(36)', varchar: 'VARCHAR2', char: 'CHAR', text: 'CLOB',
    int2: 'NUMBER(5)', int4: 'NUMBER(10)', int8: 'NUMBER(19)', numeric: 'NUMBER',
    float4: 'BINARY_FLOAT', float8: 'BINARY_DOUBLE', boolean: 'NUMBER(1)',
    date: 'DATE', time: 'TIMESTAMP', timestamp: 'TIMESTAMP', timestamptz: 'TIMESTAMP WITH TIME ZONE',
    json: 'CLOB', jsonb: 'CLOB', enum: 'VARCHAR2(255)', blob: 'BLOB',
  },
};

function buildCatalog(dialect: DialectId): TypeCatalog {
  const names = SQL_NAMES[dialect];
  const catalog: TypeCatalog = {};
  for (const key of Object.keys(CANON)) {
    catalog[key] = { key, name: names[key] ?? key.toUpperCase(), ...CANON[key] };
  }
  return catalog;
}

export const CATALOGS: Record<DialectId, TypeCatalog> = {
  postgres: buildCatalog('postgres'),
  mysql: buildCatalog('mysql'),
  mariadb: buildCatalog('mariadb'),
  sqlite: buildCatalog('sqlite'),
  mssql: buildCatalog('mssql'),
  oracle: buildCatalog('oracle'),
};

/** All canonical type keys (for UI pickers). */
export const TYPE_KEYS: string[] = Object.keys(CANON);

export function typeDef(dialect: DialectId, key: string): TypeDef | undefined {
  return CATALOGS[dialect][key];
}
