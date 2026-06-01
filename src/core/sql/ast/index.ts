/**
 * Neutral AST — a small, parser-independent representation of DDL. node-sql-parser's output is
 * normalized into this shape (import/fromNodeSql), then turned into the domain model
 * (import/parse). The indirection insulates the engine from the parser library and lets us swap
 * parsers per dialect later without touching model-building.
 */
export interface NeutralColumn {
  name: string;
  /** Raw SQL type name as written (e.g. 'VARCHAR', 'SERIAL'); mapped to a catalog key later. */
  dataType: string;
  size?: number;
  scale?: number;
  notNull: boolean;
  primary: boolean;
  unique: boolean;
  autoIncrement: boolean;
  default?: string;
}

export interface NeutralForeignKey {
  name?: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
  onDelete?: string;
  onUpdate?: string;
}

export interface NeutralTable {
  name: string;
  schema?: string;
  columns: NeutralColumn[];
  primaryKey: string[];
  foreignKeys: NeutralForeignKey[];
}

export interface NeutralSchema {
  tables: NeutralTable[];
  warnings: string[];
}
