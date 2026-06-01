/**
 * Builds a core `Diagram` from the seed demo data so the editor opens with content.
 * Temporary — replaced by loaded/persisted diagrams in M4.
 */
import {
  createDiagram,
  createField,
  createRelationship,
  createTable,
  type Cardinality,
  type Diagram,
} from '@core';
import { rels, tables } from './seed';

const CARD: Record<string, Cardinality> = {
  '1:1': 'one_to_one',
  '1:n': 'one_to_many',
  'n:1': 'many_to_one',
  'n:n': 'many_to_many',
};

export function seedDiagram(): Diagram {
  const d = createDiagram('core-product-db', 'Core Product DB', 'postgres');

  d.tables = tables.map((t) =>
    createTable(t.id, t.name, {
      color: t.color,
      position: { x: t.x, y: t.y },
      fields: t.fields.map((f) =>
        createField(f.id, f.name, f.type, {
          primary: !!f.pk,
          notNull: !!f.notNull || !!f.pk,
        }),
      ),
    }),
  );

  d.relationships = rels.map((r) =>
    createRelationship(
      r.id,
      { tableId: r.from[0], fieldId: r.from[1] },
      { tableId: r.to[0], fieldId: r.to[1] },
      { cardinality: CARD[r.card] ?? 'many_to_one' },
    ),
  );

  return d;
}
