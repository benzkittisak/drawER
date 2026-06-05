/**
 * JSON interchange — serialize/parse the versioned SavedDiagram format. Pure & deterministic
 * (no timestamps stamped inside core; the caller passes exportedAt). parse() migrates old
 * versions, normalizes missing optionals to a complete Diagram, and validates the result.
 */
import { validateDiagram } from '../model/guards';
import type {
  Area,
  CustomType,
  Diagram,
  DialectId,
  EnumType,
  Field,
  Index,
  Note,
  Position,
  Relationship,
  Table,
} from '../model/types';
import { migrate } from './migrate';
import { APP_TAG, CURRENT_VERSION, type SavedDiagram } from './schema';

export function serialize(diagram: Diagram, exportedAt?: string): SavedDiagram {
  return { version: CURRENT_VERSION, app: APP_TAG, ...(exportedAt ? { exportedAt } : {}), diagram };
}

export function serializeToString(diagram: Diagram, exportedAt?: string): string {
  return JSON.stringify(serialize(diagram, exportedAt), null, 2);
}

// ---- defensive readers ----
type Rec = Record<string, unknown>;
const obj = (v: unknown): Rec => (typeof v === 'object' && v !== null ? (v as Rec) : {});
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === 'number' ? v : d);
const boolean = (v: unknown): boolean => v === true;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const optStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const optNum = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const optBool = (v: unknown): true | undefined => (v === true ? true : undefined);

const position = (v: unknown): Position => {
  const p = obj(v);
  return { x: num(p.x), y: num(p.y) };
};

function normField(v: unknown): Field {
  const f = obj(v);
  return {
    id: str(f.id),
    name: str(f.name),
    type: str(f.type, 'text'),
    size: optNum(f.size),
    scale: optNum(f.scale),
    values: Array.isArray(f.values) ? (f.values as unknown[]).map((x) => str(x)) : undefined,
    primary: boolean(f.primary),
    unique: boolean(f.unique),
    notNull: boolean(f.notNull),
    autoIncrement: boolean(f.autoIncrement),
    array: optBool(f.array),
    default: optStr(f.default),
    comment: optStr(f.comment),
    customTypeId: optStr(f.customTypeId),
  };
}

function normIndex(v: unknown): Index {
  const i = obj(v);
  return { id: str(i.id), name: str(i.name), fieldIds: arr(i.fieldIds).map((x) => str(x)), unique: boolean(i.unique) };
}

function normTable(v: unknown): Table {
  const t = obj(v);
  return {
    id: str(t.id),
    name: str(t.name),
    schema: optStr(t.schema),
    color: optStr(t.color),
    comment: optStr(t.comment),
    position: position(t.position),
    fields: arr(t.fields).map(normField),
    indices: arr(t.indices).map(normIndex),
  };
}

function normRelationship(v: unknown): Relationship {
  const r = obj(v);
  return {
    id: str(r.id),
    name: str(r.name),
    fromTableId: str(r.fromTableId),
    fromFieldId: str(r.fromFieldId),
    toTableId: str(r.toTableId),
    toFieldId: str(r.toFieldId),
    cardinality: (str(r.cardinality, 'many_to_one') as Relationship['cardinality']),
    onUpdate: (str(r.onUpdate, 'NO ACTION') as Relationship['onUpdate']),
    onDelete: (str(r.onDelete, 'NO ACTION') as Relationship['onDelete']),
    routeOffsetX: optNum(r.routeOffsetX),
  };
}

function normNote(v: unknown): Note {
  const n = obj(v);
  return { id: str(n.id), title: optStr(n.title), content: str(n.content), position: position(n.position), color: optStr(n.color) };
}
function normArea(v: unknown): Area {
  const a = obj(v);
  return { id: str(a.id), name: str(a.name), position: position(a.position), width: num(a.width, 200), height: num(a.height, 160), color: optStr(a.color) };
}
function normCustomType(v: unknown): CustomType {
  const c = obj(v);
  return { id: str(c.id), name: str(c.name), fields: arr(c.fields).map((x) => { const o = obj(x); return { name: str(o.name), type: str(o.type) }; }) };
}
function normEnum(v: unknown): EnumType {
  const e = obj(v);
  return { id: str(e.id), name: str(e.name), values: arr(e.values).map((x) => str(x)) };
}

function normalizeDiagram(v: unknown): Diagram {
  const d = obj(v);
  const meta = obj(d.meta);
  return {
    id: str(d.id),
    name: str(d.name, 'Untitled diagram'),
    dialect: str(d.dialect, 'postgres') as DialectId,
    tables: arr(d.tables).map(normTable),
    relationships: arr(d.relationships).map(normRelationship),
    notes: arr(d.notes).map(normNote),
    areas: arr(d.areas).map(normArea),
    customTypes: arr(d.customTypes).map(normCustomType),
    enums: arr(d.enums).map(normEnum),
    meta: { createdAt: num(meta.createdAt), updatedAt: num(meta.updatedAt) },
  };
}

export function parse(json: unknown): Diagram {
  const raw = typeof json === 'string' ? (JSON.parse(json) as unknown) : json;
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid JSON: expected an object');
  const migrated = migrate(raw as Rec);
  // tolerate either { diagram } envelope or a bare diagram
  const diagram = normalizeDiagram('diagram' in migrated ? migrated.diagram : migrated);
  const errors = validateDiagram(diagram);
  if (errors.length) throw new Error('Invalid diagram: ' + errors.join('; '));
  return diagram;
}
