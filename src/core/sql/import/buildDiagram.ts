/**
 * Build a Diagram from a neutral AST (shared by SQL import and remote DB introspect).
 */
import { createDiagram, createField, createRelationship, createTable } from '../../model/factory';
import { newId } from '../../id';
import type { Cardinality, Diagram, DialectId, RefAction } from '../../model/types';
import type { NeutralSchema } from '../ast';
import { reverseType } from './typeMap';

function normalizeAction(raw?: string): RefAction | undefined {
  if (!raw) return undefined;
  const u = raw.toUpperCase();
  const allowed: RefAction[] = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'];
  return allowed.find((a) => a === u);
}

export function buildDiagramFromNeutral(schema: NeutralSchema, dialect: DialectId): Diagram {
  const d = createDiagram(newId(), 'Imported schema', dialect);
  const tableIdByName = new Map<string, string>();
  const fieldIdByName = new Map<string, string>();

  for (const t of schema.tables) {
    const tableId = newId();
    tableIdByName.set(t.name, tableId);
    const pkSet = new Set(t.primaryKey);
    const fields = t.columns.map((c) => {
      const fieldId = newId();
      fieldIdByName.set(`${t.name}.${c.name}`, fieldId);
      const { key, autoIncrement } = reverseType(c.dataType);
      return createField(fieldId, c.name, key, {
        primary: c.primary || pkSet.has(c.name),
        notNull: c.notNull,
        unique: c.unique,
        autoIncrement: c.autoIncrement || autoIncrement,
        size: c.size,
        scale: c.scale,
        default: c.default,
      });
    });
    d.tables.push(createTable(tableId, t.name, { schema: t.schema, fields, position: { x: 0, y: 0 } }));
  }

  for (const t of schema.tables) {
    for (const fk of t.foreignKeys) {
      const fromTableId = tableIdByName.get(t.name);
      const toTableId = tableIdByName.get(fk.refTable);
      const fromFieldId = fieldIdByName.get(`${t.name}.${fk.columns[0]}`);
      const toFieldId = fieldIdByName.get(`${fk.refTable}.${fk.refColumns[0]}`);
      if (!fromTableId || !toTableId || !fromFieldId || !toFieldId) {
        schema.warnings.push(`Could not resolve foreign key on ${t.name} → ${fk.refTable}`);
        continue;
      }
      const card: Cardinality = 'many_to_one';
      d.relationships.push(
        createRelationship(
          newId(),
          { tableId: fromTableId, fieldId: fromFieldId },
          { tableId: toTableId, fieldId: toFieldId },
          {
            name: fk.name ?? `fk_${t.name}_${fk.columns[0]}`,
            cardinality: card,
            onDelete: normalizeAction(fk.onDelete) ?? 'NO ACTION',
            onUpdate: normalizeAction(fk.onUpdate) ?? 'NO ACTION',
          },
        ),
      );
    }
  }

  return d;
}
