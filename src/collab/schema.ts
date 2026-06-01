/**
 * Mapping between the core `Diagram` model and the Yjs document, plus mutators that operate on
 * the shared types (always called inside a transaction by the session). Read (`readDiagram`) is
 * the inverse of the initial write (`writeDiagram`) and must round-trip losslessly.
 */
import * as Y from 'yjs';
import type {
  Area,
  CustomType,
  Diagram,
  DialectId,
  EnumType,
  Field,
  Index,
  Note,
  Relationship,
  Table,
} from '@core';
import type { DocMaps, YArr, YMap } from './ydoc';

// ---- field ----
function fieldToY(f: Field): YMap {
  const m = new Y.Map<unknown>();
  m.set('id', f.id);
  m.set('name', f.name);
  m.set('type', f.type);
  if (f.size != null) m.set('size', f.size);
  if (f.scale != null) m.set('scale', f.scale);
  if (f.values) m.set('values', f.values);
  m.set('primary', f.primary);
  m.set('unique', f.unique);
  m.set('notNull', f.notNull);
  m.set('autoIncrement', f.autoIncrement);
  if (f.default != null) m.set('default', f.default);
  if (f.comment != null) m.set('comment', f.comment);
  if (f.customTypeId != null) m.set('customTypeId', f.customTypeId);
  return m;
}

function yToField(m: YMap): Field {
  const opt = <T>(k: string): T | undefined => {
    const v = m.get(k);
    return v === undefined ? undefined : (v as T);
  };
  return {
    id: m.get('id') as string,
    name: m.get('name') as string,
    type: m.get('type') as string,
    size: opt<number>('size'),
    scale: opt<number>('scale'),
    values: opt<string[]>('values'),
    primary: !!m.get('primary'),
    unique: !!m.get('unique'),
    notNull: !!m.get('notNull'),
    autoIncrement: !!m.get('autoIncrement'),
    default: opt<string>('default'),
    comment: opt<string>('comment'),
    customTypeId: opt<string>('customTypeId'),
  };
}

// ---- table ----
function tableToY(t: Table): YMap {
  const m = new Y.Map<unknown>();
  m.set('id', t.id);
  m.set('name', t.name);
  if (t.schema != null) m.set('schema', t.schema);
  if (t.color != null) m.set('color', t.color);
  if (t.comment != null) m.set('comment', t.comment);
  m.set('x', t.position.x);
  m.set('y', t.position.y);
  const fields = new Y.Array<unknown>();
  fields.push(t.fields.map(fieldToY));
  m.set('fields', fields);
  m.set('indices', t.indices); // not edited in UI → plain JSON value
  return m;
}

function yToTable(m: YMap): Table {
  const fieldsArr = m.get('fields') as YArr | undefined;
  const fields = fieldsArr ? (fieldsArr.toArray() as YMap[]).map(yToField) : [];
  return {
    id: m.get('id') as string,
    name: m.get('name') as string,
    schema: (m.get('schema') as string) ?? undefined,
    color: (m.get('color') as string) ?? undefined,
    comment: (m.get('comment') as string) ?? undefined,
    position: { x: (m.get('x') as number) ?? 0, y: (m.get('y') as number) ?? 0 },
    fields,
    indices: ((m.get('indices') as Index[]) ?? []).map((i) => ({ ...i })),
  };
}

// ---- relationship ----
function relToY(r: Relationship): YMap {
  const m = new Y.Map<unknown>();
  for (const k of ['id', 'name', 'fromTableId', 'fromFieldId', 'toTableId', 'toFieldId', 'cardinality', 'onUpdate', 'onDelete'] as const) {
    m.set(k, r[k]);
  }
  return m;
}
function yToRel(m: YMap): Relationship {
  return {
    id: m.get('id') as string,
    name: m.get('name') as string,
    fromTableId: m.get('fromTableId') as string,
    fromFieldId: m.get('fromFieldId') as string,
    toTableId: m.get('toTableId') as string,
    toFieldId: m.get('toFieldId') as string,
    cardinality: m.get('cardinality') as Relationship['cardinality'],
    onUpdate: m.get('onUpdate') as Relationship['onUpdate'],
    onDelete: m.get('onDelete') as Relationship['onDelete'],
  };
}

// ---- whole diagram ----
export function writeDiagram(maps: DocMaps, d: Diagram): void {
  maps.meta.set('id', d.id);
  maps.meta.set('name', d.name);
  maps.meta.set('dialect', d.dialect);
  maps.meta.set('createdAt', d.meta.createdAt);
  maps.meta.set('updatedAt', d.meta.updatedAt);
  for (const t of d.tables) maps.tables.set(t.id, tableToY(t));
  for (const r of d.relationships) maps.rels.set(r.id, relToY(r));
  maps.aux.set('notes', d.notes);
  maps.aux.set('areas', d.areas);
  maps.aux.set('customTypes', d.customTypes);
  maps.aux.set('enums', d.enums);
}

export function readDiagram(maps: DocMaps): Diagram {
  const tables = (Array.from(maps.tables.values()) as YMap[]).map(yToTable);
  const relationships = (Array.from(maps.rels.values()) as YMap[]).map(yToRel);
  const clone = <T>(v: unknown): T[] => ((v as T[]) ?? []).map((x) => ({ ...(x as object) }) as T);
  return {
    id: (maps.meta.get('id') as string) ?? '',
    name: (maps.meta.get('name') as string) ?? 'Untitled diagram',
    dialect: ((maps.meta.get('dialect') as DialectId) ?? 'postgres') as DialectId,
    tables,
    relationships,
    notes: clone<Note>(maps.aux.get('notes')),
    areas: clone<Area>(maps.aux.get('areas')),
    customTypes: clone<CustomType>(maps.aux.get('customTypes')),
    enums: clone<EnumType>(maps.aux.get('enums')),
    meta: {
      createdAt: (maps.meta.get('createdAt') as number) ?? 0,
      updatedAt: (maps.meta.get('updatedAt') as number) ?? 0,
    },
  };
}

// ---- mutators (call inside a transaction) ----
const tableMap = (maps: DocMaps, id: string): YMap | undefined => maps.tables.get(id);
const fieldArray = (t: YMap): YArr => t.get('fields') as YArr;
const findFieldIndex = (fields: YArr, fieldId: string): number =>
  (fields.toArray() as YMap[]).findIndex((f) => f.get('id') === fieldId);

export const mut = {
  setTablePosition(maps: DocMaps, id: string, x: number, y: number): void {
    const t = tableMap(maps, id);
    if (!t) return;
    t.set('x', x);
    t.set('y', y);
  },
  addTable(maps: DocMaps, table: Table): void {
    maps.tables.set(table.id, tableToY(table));
  },
  updateTable(maps: DocMaps, id: string, patch: Partial<Omit<Table, 'id' | 'fields' | 'indices'>>): void {
    const t = tableMap(maps, id);
    if (!t) return;
    if (patch.name != null) t.set('name', patch.name);
    if (patch.color != null) t.set('color', patch.color);
    if (patch.comment != null) t.set('comment', patch.comment);
    if (patch.schema != null) t.set('schema', patch.schema);
    if (patch.position) {
      t.set('x', patch.position.x);
      t.set('y', patch.position.y);
    }
  },
  addField(maps: DocMaps, tableId: string, field: Field): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    fieldArray(t).push([fieldToY(field)]);
  },
  updateField(maps: DocMaps, tableId: string, fieldId: string, patch: Partial<Omit<Field, 'id'>>): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    const fields = fieldArray(t);
    const idx = findFieldIndex(fields, fieldId);
    if (idx < 0) return;
    const fm = fields.get(idx) as YMap;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) fm.delete(k);
      else fm.set(k, v);
    }
  },
  removeField(maps: DocMaps, tableId: string, fieldId: string): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    const fields = fieldArray(t);
    const idx = findFieldIndex(fields, fieldId);
    if (idx >= 0) fields.delete(idx, 1);
    for (const [rid, rm] of maps.rels.entries()) {
      if (rm.get('fromFieldId') === fieldId || rm.get('toFieldId') === fieldId) maps.rels.delete(rid);
    }
  },
  reorderField(maps: DocMaps, tableId: string, fieldId: string, toIndex: number): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    const fields = fieldArray(t);
    const idx = findFieldIndex(fields, fieldId);
    if (idx < 0) return;
    const clone = yToField(fields.get(idx) as YMap);
    fields.delete(idx, 1);
    fields.insert(Math.max(0, Math.min(fields.length, toIndex)), [fieldToY(clone)]);
  },
  addRelationship(maps: DocMaps, rel: Relationship): void {
    maps.rels.set(rel.id, relToY(rel));
  },
  deleteEntity(maps: DocMaps, id: string): void {
    if (maps.tables.has(id)) {
      maps.tables.delete(id);
      for (const [rid, rm] of maps.rels.entries()) {
        if (rm.get('fromTableId') === id || rm.get('toTableId') === id) maps.rels.delete(rid);
      }
    } else {
      maps.rels.delete(id);
    }
  },
  renameDiagram(maps: DocMaps, name: string): void {
    maps.meta.set('name', name);
  },
};
