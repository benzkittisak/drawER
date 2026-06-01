/**
 * Factories that produce fully-defaulted, schema-valid entities.
 * IDs are injected (params) to keep these deterministic — see src/core/id.ts for runtime ids.
 */
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
} from './types';

export function createField(id: string, name: string, type: string, partial: Partial<Field> = {}): Field {
  return {
    id,
    name,
    type,
    primary: false,
    unique: false,
    notNull: false,
    autoIncrement: false,
    ...partial,
  };
}

export function createIndex(id: string, name: string, fieldIds: string[], unique = false): Index {
  return { id, name, fieldIds, unique };
}

export function createTable(id: string, name: string, partial: Partial<Table> = {}): Table {
  return {
    id,
    name,
    position: { x: 0, y: 0 },
    fields: [],
    indices: [],
    ...partial,
  };
}

export function createRelationship(
  id: string,
  from: { tableId: string; fieldId: string },
  to: { tableId: string; fieldId: string },
  partial: Partial<Relationship> = {},
): Relationship {
  return {
    id,
    name: partial.name ?? `fk_${from.tableId}_${from.fieldId}`,
    fromTableId: from.tableId,
    fromFieldId: from.fieldId,
    toTableId: to.tableId,
    toFieldId: to.fieldId,
    cardinality: partial.cardinality ?? 'many_to_one',
    onUpdate: partial.onUpdate ?? 'NO ACTION',
    onDelete: partial.onDelete ?? 'NO ACTION',
  };
}

export function createNote(id: string, content: string, partial: Partial<Note> = {}): Note {
  return { id, content, position: { x: 0, y: 0 }, ...partial };
}

export function createArea(id: string, name: string, partial: Partial<Area> = {}): Area {
  return { id, name, position: { x: 0, y: 0 }, width: 200, height: 160, ...partial };
}

export function createCustomType(id: string, name: string, fields: CustomType['fields'] = []): CustomType {
  return { id, name, fields };
}

export function createEnum(id: string, name: string, values: string[] = []): EnumType {
  return { id, name, values };
}

export function createDiagram(id: string, name: string, dialect: DialectId, now = 0): Diagram {
  return {
    id,
    name,
    dialect,
    tables: [],
    relationships: [],
    notes: [],
    areas: [],
    customTypes: [],
    enums: [],
    meta: { createdAt: now, updatedAt: now },
  };
}
