/**
 * DBML importer (DBML → our model) via @dbml/core (Apache-2.0). Defensive: parse failures
 * become warnings, not throws. Maps tables, fields, enums, and refs (with cardinality).
 */
import { autoLayout } from '../layout/autoLayout';
import { createDiagram, createEnum, createField, createRelationship, createTable } from '../model/factory';
import { newId } from '../id';
import type { Cardinality, Diagram, DialectId } from '../model/types';
import { reverseType } from '../sql/import/typeMap';

export interface DbmlImportResult {
  diagram: Diagram;
  warnings: string[];
}

// ---- @dbml/core model subset we read ----
interface DbmlField {
  name: string;
  type?: { type_name?: string; args?: string | null };
  pk?: boolean;
  increment?: boolean;
  not_null?: boolean;
  unique?: boolean;
  dbdefault?: { value?: unknown } | null;
  note?: { value?: string } | string | null;
}
interface DbmlEndpoint {
  tableName: string;
  fieldNames: string[];
  relation: string; // '1' | '*'
}
interface DbmlRef {
  name?: string | null;
  endpoints: DbmlEndpoint[];
}
interface DbmlEnum {
  name: string;
  values: { name: string }[];
}
interface DbmlSchema {
  tables: { name: string; fields: DbmlField[]; note?: { value?: string } | null }[];
  refs: DbmlRef[];
  enums?: DbmlEnum[];
}
interface DbmlDatabase {
  schemas: DbmlSchema[];
}

function parseType(type?: { type_name?: string; args?: string | null }): { key: string; size?: number; scale?: number; autoIncrement: boolean; array?: boolean } {
  const raw = type?.type_name ?? 'text';
  const base = raw.split('(')[0].trim();
  const { key, autoIncrement, array } = reverseType(base);
  let size: number | undefined;
  let scale: number | undefined;
  const args = type?.args ?? (raw.includes('(') ? raw.slice(raw.indexOf('(') + 1, raw.indexOf(')')) : undefined);
  if (args) {
    const parts = String(args).split(',').map((s) => parseInt(s.trim(), 10));
    if (!Number.isNaN(parts[0])) size = parts[0];
    if (parts.length > 1 && !Number.isNaN(parts[1])) scale = parts[1];
  }
  return { key, size, scale, autoIncrement, array };
}

function noteText(n: DbmlField['note']): string | undefined {
  if (!n) return undefined;
  return typeof n === 'string' ? n : n.value;
}

function cardinalityOf(a: DbmlEndpoint, b: DbmlEndpoint): { child: DbmlEndpoint; parent: DbmlEndpoint; card: Cardinality } {
  if (a.relation === '1' && b.relation === '1') return { child: a, parent: b, card: 'one_to_one' };
  if (a.relation === '*' && b.relation === '*') return { child: a, parent: b, card: 'many_to_many' };
  // many-to-one: child is the '*' side
  const child = a.relation === '*' ? a : b;
  const parent = child === a ? b : a;
  return { child, parent, card: 'many_to_one' };
}

export async function dbmlToDiagram(dbml: string, dialect: DialectId = 'postgres'): Promise<DbmlImportResult> {
  const warnings: string[] = [];
  let db: DbmlDatabase;
  try {
    const { Parser } = await import('@dbml/core');
    db = Parser.parse(dbml, 'dbml') as unknown as DbmlDatabase;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { diagram: createDiagram(newId(), 'Imported (DBML)', dialect), warnings: [`DBML parse error: ${msg}`] };
  }

  const d = createDiagram(newId(), 'Imported (DBML)', dialect);
  const schema = db.schemas[0];
  if (!schema) return { diagram: d, warnings: ['Empty DBML'] };

  for (const e of schema.enums ?? []) {
    d.enums.push(createEnum(newId(), e.name, e.values.map((v) => v.name)));
  }

  const tableIdByName = new Map<string, string>();
  const fieldIdByName = new Map<string, string>();

  for (const t of schema.tables) {
    const tableId = newId();
    tableIdByName.set(t.name, tableId);
    const fields = t.fields.map((f) => {
      const fieldId = newId();
      fieldIdByName.set(`${t.name}.${f.name}`, fieldId);
      const { key, size, scale, autoIncrement, array } = parseType(f.type);
      const dflt = f.dbdefault?.value;
      return createField(fieldId, f.name, key, {
        primary: !!f.pk,
        notNull: !!f.not_null,
        unique: !!f.unique,
        autoIncrement: !!f.increment || autoIncrement,
        size,
        scale,
        array,
        default: dflt == null ? undefined : String(dflt),
        comment: noteText(f.note),
      });
    });
    d.tables.push(createTable(tableId, t.name, { fields, position: { x: 0, y: 0 } }));
  }

  for (const ref of schema.refs) {
    if (ref.endpoints.length < 2) continue;
    const { child, parent, card } = cardinalityOf(ref.endpoints[0], ref.endpoints[1]);
    const fromTableId = tableIdByName.get(child.tableName);
    const toTableId = tableIdByName.get(parent.tableName);
    const fromFieldId = fieldIdByName.get(`${child.tableName}.${child.fieldNames[0]}`);
    const toFieldId = fieldIdByName.get(`${parent.tableName}.${parent.fieldNames[0]}`);
    if (!fromTableId || !toTableId || !fromFieldId || !toFieldId) {
      warnings.push(`Could not resolve DBML ref ${child.tableName} → ${parent.tableName}`);
      continue;
    }
    d.relationships.push(
      createRelationship(
        newId(),
        { tableId: fromTableId, fieldId: fromFieldId },
        { tableId: toTableId, fieldId: toFieldId },
        { name: ref.name ?? `fk_${child.tableName}_${child.fieldNames[0]}`, cardinality: card },
      ),
    );
  }

  return { diagram: await autoLayout(d), warnings };
}
