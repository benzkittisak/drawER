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
  if (f.array) m.set('array', f.array);
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
    array: opt<boolean>('array'),
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
  m.set('indices', t.indices);
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
  if (r.routeOffsetX != null) m.set('routeOffsetX', r.routeOffsetX);
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
    routeOffsetX: (m.get('routeOffsetX') as number | undefined) ?? undefined,
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

function refsEqual<T>(a: readonly T[] | null | undefined, b: readonly T[]): boolean {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < b.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Stateful variant of `readDiagram` that preserves object identity for the parts that didn't
 * change between calls: an unchanged table/relationship/aux-array keeps its previous reference, and
 * the whole `Diagram` keeps its reference when nothing changed at all. This lets `React.memo` and
 * the zustand selectors skip work — editing one table re-renders only that table instead of every
 * table in the diagram. The derived content is identical to `readDiagram` (lossless round-trip);
 * only the references are reused. One reader is created per open document (see session.ts).
 */
export function createDiagramReader(): (maps: DocMaps) => Diagram {
  let prev: Diagram | null = null;
  const tableCache = new Map<string, { obj: Table; sig: string }>();
  const relCache = new Map<string, { obj: Relationship; sig: string }>();
  const auxCache = new Map<string, { obj: unknown[]; sig: string }>();

  // Clone + cache an aux LWW array (notes/areas/customTypes/enums), reusing the prior array when
  // its serialized content is unchanged.
  const stableList = <T>(name: string, raw: unknown): T[] => {
    const arr = ((raw as T[]) ?? []).map((x) => ({ ...(x as object) }) as T);
    const sig = JSON.stringify(arr);
    const cached = auxCache.get(name);
    if (cached && cached.sig === sig) return cached.obj as T[];
    auxCache.set(name, { obj: arr as unknown[], sig });
    return arr;
  };

  return (maps: DocMaps): Diagram => {
    const seenT = new Set<string>();
    const tables: Table[] = [];
    for (const ym of Array.from(maps.tables.values()) as YMap[]) {
      const t = yToTable(ym);
      seenT.add(t.id);
      const sig = JSON.stringify(t);
      const cached = tableCache.get(t.id);
      if (cached && cached.sig === sig) tables.push(cached.obj);
      else {
        tableCache.set(t.id, { obj: t, sig });
        tables.push(t);
      }
    }
    for (const id of [...tableCache.keys()]) if (!seenT.has(id)) tableCache.delete(id);

    const seenR = new Set<string>();
    const relationships: Relationship[] = [];
    for (const ym of Array.from(maps.rels.values()) as YMap[]) {
      const r = yToRel(ym);
      seenR.add(r.id);
      const sig = JSON.stringify(r);
      const cached = relCache.get(r.id);
      if (cached && cached.sig === sig) relationships.push(cached.obj);
      else {
        relCache.set(r.id, { obj: r, sig });
        relationships.push(r);
      }
    }
    for (const id of [...relCache.keys()]) if (!seenR.has(id)) relCache.delete(id);

    const tablesRef = prev && refsEqual(prev.tables, tables) ? prev.tables : tables;
    const relsRef = prev && refsEqual(prev.relationships, relationships) ? prev.relationships : relationships;
    const notes = stableList<Note>('notes', maps.aux.get('notes'));
    const areas = stableList<Area>('areas', maps.aux.get('areas'));
    const customTypes = stableList<CustomType>('customTypes', maps.aux.get('customTypes'));
    const enums = stableList<EnumType>('enums', maps.aux.get('enums'));

    const id = (maps.meta.get('id') as string) ?? '';
    const name = (maps.meta.get('name') as string) ?? 'Untitled diagram';
    const dialect = ((maps.meta.get('dialect') as DialectId) ?? 'postgres') as DialectId;
    const createdAt = (maps.meta.get('createdAt') as number) ?? 0;
    const updatedAt = (maps.meta.get('updatedAt') as number) ?? 0;

    if (
      prev &&
      prev.id === id &&
      prev.name === name &&
      prev.dialect === dialect &&
      prev.meta.createdAt === createdAt &&
      prev.meta.updatedAt === updatedAt &&
      prev.tables === tablesRef &&
      prev.relationships === relsRef &&
      prev.notes === notes &&
      prev.areas === areas &&
      prev.customTypes === customTypes &&
      prev.enums === enums
    ) {
      return prev; // nothing changed — hand back the exact same object so all consumers skip
    }

    const next: Diagram = {
      id,
      name,
      dialect,
      tables: tablesRef,
      relationships: relsRef,
      notes,
      areas,
      customTypes,
      enums,
      meta: { createdAt, updatedAt },
    };
    prev = next;
    return next;
  };
}

// ---- mutators (call inside a transaction) ----
const tableMap = (maps: DocMaps, id: string): YMap | undefined => maps.tables.get(id);
const fieldArray = (t: YMap): YArr => t.get('fields') as YArr;
const findFieldIndex = (fields: YArr, fieldId: string): number =>
  (fields.toArray() as YMap[]).findIndex((f) => f.get('id') === fieldId);

const readIndices = (t: YMap): Index[] => ((t.get('indices') as Index[]) ?? []).map((i) => ({ ...i, fieldIds: [...i.fieldIds] }));
const writeIndices = (t: YMap, indices: Index[]): void => {
  t.set('indices', indices);
};

const pruneIndicesForField = (indices: Index[], fieldId: string): Index[] =>
  indices
    .map((ix) => ({ ...ix, fieldIds: ix.fieldIds.filter((id) => id !== fieldId) }))
    .filter((ix) => ix.fieldIds.length > 0);

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
    if ('comment' in patch) {
      if (patch.comment) t.set('comment', patch.comment);
      else t.delete('comment');
    }
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
    writeIndices(t, pruneIndicesForField(readIndices(t), fieldId));
    for (const [rid, rm] of maps.rels.entries()) {
      if (rm.get('fromFieldId') === fieldId || rm.get('toFieldId') === fieldId) maps.rels.delete(rid);
    }
  },
  addIndex(maps: DocMaps, tableId: string, index: Index): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    writeIndices(t, [...readIndices(t), index]);
  },
  updateIndex(maps: DocMaps, tableId: string, indexId: string, patch: Partial<Omit<Index, 'id'>>): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    writeIndices(
      t,
      readIndices(t).map((ix) => (ix.id === indexId ? { ...ix, ...patch, fieldIds: patch.fieldIds ?? ix.fieldIds } : ix)),
    );
  },
  removeIndex(maps: DocMaps, tableId: string, indexId: string): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    writeIndices(
      t,
      readIndices(t).filter((ix) => ix.id !== indexId),
    );
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
  /** Rebuild the whole field order in one shot (for multi-column drag). `orderedIds` must be a full
   *  permutation of the table's field ids — otherwise it's a no-op (guards against data loss). */
  reorderFields(maps: DocMaps, tableId: string, orderedIds: string[]): void {
    const t = tableMap(maps, tableId);
    if (!t) return;
    const fields = fieldArray(t);
    const byId = new Map((fields.toArray() as YMap[]).map((m) => { const f = yToField(m); return [f.id, f]; }));
    const next = orderedIds.filter((id) => byId.has(id));
    if (next.length !== byId.size) return;
    fields.delete(0, fields.length);
    fields.push(next.map((id) => fieldToY(byId.get(id)!)));
  },
  addRelationship(maps: DocMaps, rel: Relationship): void {
    maps.rels.set(rel.id, relToY(rel));
  },
  updateRelationship(
    maps: DocMaps,
    id: string,
    patch: Partial<Pick<Relationship, 'name' | 'cardinality' | 'onUpdate' | 'onDelete' | 'routeOffsetX'>>,
  ): void {
    const rm = maps.rels.get(id);
    if (!rm) return;
    if (patch.name != null) rm.set('name', patch.name);
    if (patch.cardinality != null) rm.set('cardinality', patch.cardinality);
    if (patch.onUpdate != null) rm.set('onUpdate', patch.onUpdate);
    if (patch.onDelete != null) rm.set('onDelete', patch.onDelete);
    // null/undefined clears the manual route offset (reset to auto-routing); a number sets it.
    if ('routeOffsetX' in patch) {
      if (patch.routeOffsetX == null) rm.delete('routeOffsetX');
      else rm.set('routeOffsetX', patch.routeOffsetX);
    }
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
