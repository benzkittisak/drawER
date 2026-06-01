import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import { buildSampleDiagram } from '@core/sql/__tests__/sampleModel';
import { createField, createRelationship } from '@core';
import { createDoc } from './ydoc';
import { mut, readDiagram, writeDiagram } from './schema';

function docWithSample() {
  const { doc, maps } = createDoc();
  doc.transact(() => writeDiagram(maps, buildSampleDiagram()), 'load');
  return { doc, maps };
}

describe('Yjs schema mapping', () => {
  it('round-trips the model losslessly', () => {
    const { maps } = docWithSample();
    expect(readDiagram(maps)).toEqual(buildSampleDiagram());
  });

  it('mutators edit tables/fields/relationships', () => {
    const { doc, maps } = docWithSample();
    doc.transact(() => mut.setTablePosition(maps, 'users', 50, 60));
    doc.transact(() => mut.addField(maps, 'users', createField('u_new', 'extra', 'text')));
    doc.transact(() => mut.updateField(maps, 'users', 'u_email', { unique: false }));

    const d = readDiagram(maps);
    const users = d.tables.find((t) => t.id === 'users')!;
    expect(users.position).toEqual({ x: 50, y: 60 });
    expect(users.fields.map((f) => f.id)).toContain('u_new');
    expect(users.fields.find((f) => f.id === 'u_email')!.unique).toBe(false);
  });

  it('reorders fields and cascades deletes', () => {
    const { doc, maps } = docWithSample();
    doc.transact(() => mut.reorderField(maps, 'users', 'u_email', 0));
    expect(readDiagram(maps).tables.find((t) => t.id === 'users')!.fields[0].id).toBe('u_email');

    doc.transact(() => mut.deleteEntity(maps, 'orgs'));
    const after = readDiagram(maps);
    expect(after.tables.map((t) => t.id)).toEqual(['users']);
    expect(after.relationships).toEqual([]); // FK to orgs removed with the table
  });

  it('removing a referenced field drops the relationship', () => {
    const { doc, maps } = docWithSample();
    doc.transact(() => mut.removeField(maps, 'users', 'u_org'));
    expect(readDiagram(maps).relationships).toEqual([]);
  });
});

describe('CRDT sync between two docs', () => {
  it('replicates state and converges on a concurrent edit', () => {
    const a = docWithSample();
    const b = createDoc();
    // initial sync a -> b
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    expect(readDiagram(b.maps)).toEqual(readDiagram(a.maps));

    // concurrent edits: a adds a relationship, b moves a table
    a.doc.transact(() =>
      mut.addRelationship(
        a.maps,
        createRelationship('r2', { tableId: 'users', fieldId: 'u_id' }, { tableId: 'orgs', fieldId: 'o_id' }),
      ),
    );
    b.doc.transact(() => mut.setTablePosition(b.maps, 'users', 200, 100));

    // exchange updates both ways
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));

    const da = readDiagram(a.maps);
    const db = readDiagram(b.maps);
    expect(da.relationships.map((r) => r.id).sort()).toEqual(db.relationships.map((r) => r.id).sort());
    expect(da.tables.find((t) => t.id === 'users')!.position).toEqual({ x: 200, y: 100 });
    expect(db.relationships.some((r) => r.id === 'r2')).toBe(true);
  });
});
