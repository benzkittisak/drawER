import { beforeEach, describe, expect, it } from 'vitest';
import { createDiagram, createField, createRelationship, createTable } from '@core';
import { useEditorStore } from './store';

function seed() {
  const d = createDiagram('d1', 'Test', 'postgres');
  d.tables.push(
    createTable('users', 'users', { fields: [createField('u_id', 'id', 'uuid', { primary: true })] }),
    createTable('orgs', 'orgs', { fields: [createField('o_id', 'id', 'uuid', { primary: true })] }),
  );
  d.relationships.push(
    createRelationship('r1', { tableId: 'users', fieldId: 'u_id' }, { tableId: 'orgs', fieldId: 'o_id' }),
  );
  return d;
}

describe('editor store', () => {
  beforeEach(() => useEditorStore.getState().loadDiagram(seed()));

  it('moves and commits a table position', () => {
    useEditorStore.getState().moveTable('users', 120, 40);
    expect(useEditorStore.getState().diagram.tables[0].position).toEqual({ x: 120, y: 40 });
    useEditorStore.getState().commitDrag('users', 121, 41);
    expect(useEditorStore.getState().diagram.tables[0].position).toEqual({ x: 121, y: 41 });
  });

  it('adds and updates a field', () => {
    useEditorStore.getState().addField('users', createField('u_em', 'email', 'varchar'));
    useEditorStore.getState().updateField('users', 'u_em', { notNull: true, unique: true });
    const f = useEditorStore.getState().diagram.tables[0].fields.find((x) => x.id === 'u_em');
    expect(f).toMatchObject({ notNull: true, unique: true });
  });

  it('reorders fields', () => {
    useEditorStore.getState().addField('users', createField('u_a', 'a', 'text'));
    useEditorStore.getState().reorderField('users', 'u_a', 0);
    expect(useEditorStore.getState().diagram.tables[0].fields[0].id).toBe('u_a');
  });

  it('deleting a table cascades its relationships', () => {
    useEditorStore.getState().deleteEntity('users');
    const d = useEditorStore.getState().diagram;
    expect(d.tables.map((t) => t.id)).toEqual(['orgs']);
    expect(d.relationships).toEqual([]);
  });

  it('removing a referenced field drops the relationship', () => {
    useEditorStore.getState().removeField('users', 'u_id');
    expect(useEditorStore.getState().diagram.relationships).toEqual([]);
  });
});
