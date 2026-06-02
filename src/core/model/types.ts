/**
 * Canonical domain model — the single source of truth for the whole app.
 * Mirrors schemas/saved-diagram.schema.json exactly; the Yjs document and the JSON
 * format both mirror these types. Pure data — no behavior, no framework imports.
 */

export type Id = string;

export type DialectId = 'mysql' | 'mariadb' | 'postgres' | 'sqlite' | 'mssql' | 'oracle';

export type Cardinality = 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';

export type RefAction = 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';

export interface Position {
  x: number;
  y: number;
}

export interface Field {
  id: Id;
  name: string;
  /** Catalog type key, e.g. 'uuid', 'varchar', 'int4', 'enum', 'timestamp'. */
  type: string;
  size?: number;
  scale?: number;
  /** Inline enum members when type === 'enum'. */
  values?: string[];
  primary: boolean;
  unique: boolean;
  notNull: boolean;
  autoIncrement: boolean;
  default?: string;
  comment?: string;
  customTypeId?: Id;
}

export interface Index {
  id: Id;
  name: string;
  fieldIds: Id[];
  unique: boolean;
}

export interface Table {
  id: Id;
  name: string;
  schema?: string;
  color?: string;
  comment?: string;
  position: Position;
  fields: Field[];
  indices: Index[];
}

export interface Relationship {
  id: Id;
  name: string;
  /** Child side (holds the FK). */
  fromTableId: Id;
  fromFieldId: Id;
  /** Parent side (referenced). */
  toTableId: Id;
  toFieldId: Id;
  cardinality: Cardinality;
  onUpdate: RefAction;
  onDelete: RefAction;
  /** Manual horizontal offset (canvas px) of the routing segment — dragged by the user to nudge
   *  overlapping edges apart. Absent = auto-routed. */
  routeOffsetX?: number;
}

export interface CustomType {
  id: Id;
  name: string;
  fields: { name: string; type: string }[];
}

export interface EnumType {
  id: Id;
  name: string;
  values: string[];
}

export interface Note {
  id: Id;
  title?: string;
  content: string;
  position: Position;
  color?: string;
}

export interface Area {
  id: Id;
  name: string;
  position: Position;
  width: number;
  height: number;
  color?: string;
}

export interface DiagramMeta {
  createdAt: number;
  updatedAt: number;
}

export interface Diagram {
  id: Id;
  name: string;
  dialect: DialectId;
  tables: Table[];
  relationships: Relationship[];
  notes: Note[];
  areas: Area[];
  customTypes: CustomType[];
  enums: EnumType[];
  meta: DiagramMeta;
}

export const DIALECTS: DialectId[] = ['postgres', 'mysql', 'mariadb', 'sqlite', 'mssql', 'oracle'];

export const CARDINALITIES: Cardinality[] = [
  'one_to_one',
  'one_to_many',
  'many_to_one',
  'many_to_many',
];

export const REF_ACTIONS: RefAction[] = [
  'NO ACTION',
  'RESTRICT',
  'CASCADE',
  'SET NULL',
  'SET DEFAULT',
];

/** Compact UI label for a cardinality, e.g. 'n:1'. */
export const CARDINALITY_LABEL: Record<Cardinality, string> = {
  one_to_one: '1:1',
  one_to_many: '1:n',
  many_to_one: 'n:1',
  many_to_many: 'n:n',
};
