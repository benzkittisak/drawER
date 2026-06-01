import { describe, expect, it } from 'vitest';
import { createDiagram, createField, createTable, createRelationship } from './factory';
import { isDiagram, validateDiagram } from './guards';
import { CATALOGS, TYPE_KEYS } from '../catalog';
import { DIALECTS } from './types';

describe('factory', () => {
  it('createField applies boolean defaults', () => {
    const f = createField('f1', 'email', 'varchar', { notNull: true });
    expect(f).toMatchObject({ id: 'f1', name: 'email', type: 'varchar', notNull: true });
    expect(f.primary).toBe(false);
    expect(f.unique).toBe(false);
    expect(f.autoIncrement).toBe(false);
  });

  it('createDiagram is empty and schema-shaped', () => {
    const d = createDiagram('d1', 'Test', 'postgres');
    expect(d.tables).toEqual([]);
    expect(d.relationships).toEqual([]);
    expect(d.dialect).toBe('postgres');
    expect(isDiagram(d)).toBe(true);
  });

  it('createRelationship derives a default name + cardinality', () => {
    const r = createRelationship('r1', { tableId: 'a', fieldId: 'af' }, { tableId: 'b', fieldId: 'bf' });
    expect(r.cardinality).toBe('many_to_one');
    expect(r.onDelete).toBe('NO ACTION');
    expect(r.fromTableId).toBe('a');
    expect(r.toFieldId).toBe('bf');
  });
});

describe('guards', () => {
  it('accepts a valid diagram with a table', () => {
    const d = createDiagram('d1', 'T', 'mysql');
    d.tables.push(createTable('t1', 'users', { fields: [createField('f1', 'id', 'uuid', { primary: true })] }));
    expect(validateDiagram(d)).toEqual([]);
  });

  it('rejects bad dialect and missing fields', () => {
    expect(validateDiagram({ id: 'x', name: 'y', dialect: 'oracle9000', tables: [], relationships: [] }).length).toBeGreaterThan(0);
    expect(validateDiagram(null).length).toBeGreaterThan(0);
  });
});

describe('catalogs', () => {
  it('every dialect defines every canonical type with a SQL name', () => {
    for (const d of DIALECTS) {
      for (const key of TYPE_KEYS) {
        expect(CATALOGS[d][key]?.name, `${d}.${key}`).toBeTruthy();
      }
    }
  });

  it('varchar carries size metadata; uuid does not', () => {
    expect(CATALOGS.postgres.varchar.hasSize).toBe(true);
    expect(CATALOGS.postgres.varchar.defaultSize).toBe(255);
    expect(CATALOGS.postgres.uuid.hasSize).toBeFalsy();
  });
});
