/**
 * SQL import — parse DDL with node-sql-parser (Apache-2.0), normalize to the neutral AST, then
 * build the domain model and auto-layout it. Best-effort and defensive: anything it can't map
 * becomes a warning rather than a failure. Coverage is strongest for MySQL/Postgres/SQLite;
 * Oracle falls back to the Postgres grammar (flagged).
 */
import { Parser } from 'node-sql-parser';
import { autoLayout } from '../../layout/autoLayout';
import { createDiagram, createField, createRelationship, createTable } from '../../model/factory';
import { newId } from '../../id';
import type { Cardinality, Diagram, DialectId, RefAction } from '../../model/types';
import type { NeutralColumn, NeutralForeignKey, NeutralSchema, NeutralTable } from '../ast';
import { reverseType } from './typeMap';

export interface ImportResult {
  diagram: Diagram;
  warnings: string[];
}

const DB_OPTION: Record<DialectId, string> = {
  postgres: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  sqlite: 'sqlite',
  mssql: 'transactsql',
  oracle: 'postgresql',
};

// ---- minimal AST subset (only the fields we read) ----
interface ColumnRef {
  column?: string;
}
interface ColumnDef {
  resource: 'column';
  column: ColumnRef;
  definition?: { dataType?: string; length?: number | number[]; scale?: number };
  nullable?: { type?: string } | null;
  primary_key?: string | null;
  unique?: string | null;
  auto_increment?: string | null;
  default_val?: { value?: { type?: string; value?: unknown } } | null;
}
interface ConstraintDef {
  resource: 'constraint';
  constraint?: string | null;
  constraint_type?: string;
  definition?: ColumnRef[];
  reference_definition?: {
    table?: { table?: string; schema?: string }[];
    definition?: ColumnRef[];
    on_action?: { type?: string; value?: { value?: string } }[];
  };
}
type CreateDef = ColumnDef | ConstraintDef;
interface CreateStmt {
  type?: string;
  keyword?: string;
  table?: { db?: string | null; table?: string; schema?: string }[];
  create_definitions?: CreateDef[];
}

const isColumn = (d: CreateDef): d is ColumnDef => d.resource === 'column';
const colName = (r?: ColumnRef): string => r?.column ?? '';

function defaultToString(node?: { type?: string; value?: unknown }): string | undefined {
  if (!node) return undefined;
  const v = node.value;
  if (node.type === 'single_quote_string') return `'${String(v)}'`;
  if (v == null) return undefined;
  return String(v);
}

function normalizeAction(raw?: string): RefAction | undefined {
  if (!raw) return undefined;
  const u = raw.toUpperCase();
  const allowed: RefAction[] = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'];
  return allowed.find((a) => a === u);
}

function toNeutralTable(stmt: CreateStmt, warnings: string[]): NeutralTable | null {
  const meta = stmt.table?.[0];
  const name = meta?.table;
  if (!name) return null;
  const columns: NeutralColumn[] = [];
  const primaryKey: string[] = [];
  const foreignKeys: NeutralForeignKey[] = [];

  for (const def of stmt.create_definitions ?? []) {
    if (isColumn(def)) {
      const len = def.definition?.length;
      columns.push({
        name: colName(def.column),
        dataType: def.definition?.dataType ?? 'text',
        size: Array.isArray(len) ? len[0] : len,
        scale: Array.isArray(len) ? len[1] : def.definition?.scale,
        notNull: def.nullable?.type === 'not null',
        primary: !!def.primary_key,
        unique: !!def.unique,
        autoIncrement: !!def.auto_increment,
        default: defaultToString(def.default_val?.value),
      });
    } else if (def.constraint_type) {
      const ct = def.constraint_type.toLowerCase();
      if (ct === 'primary key') {
        primaryKey.push(...(def.definition ?? []).map(colName));
      } else if (ct === 'foreign key') {
        const ref = def.reference_definition;
        const refTable = ref?.table?.[0]?.table;
        if (refTable) {
          foreignKeys.push({
            name: def.constraint ?? undefined,
            columns: (def.definition ?? []).map(colName),
            refTable,
            refColumns: (ref?.definition ?? []).map(colName),
            onDelete: ref?.on_action?.find((a) => a.type === 'on delete')?.value?.value,
            onUpdate: ref?.on_action?.find((a) => a.type === 'on update')?.value?.value,
          });
        }
      } else if (ct !== 'unique' && ct !== 'unique key') {
        warnings.push(`Ignored unsupported constraint "${def.constraint_type}" on table ${name}`);
      }
    }
  }

  return { name, schema: meta?.schema, columns, primaryKey, foreignKeys };
}

function buildDiagram(schema: NeutralSchema, dialect: DialectId): Diagram {
  const d = createDiagram(newId(), 'Imported schema', dialect);
  const tableIdByName = new Map<string, string>();
  const fieldIdByName = new Map<string, string>(); // key: `${tableName}.${colName}`

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

export function importSql(sql: string, dialect: DialectId): ImportResult {
  const warnings: string[] = [];
  if (dialect === 'oracle') warnings.push('Oracle import is best-effort (parsed with the Postgres grammar).');

  let statements: CreateStmt[] = [];
  try {
    const parser = new Parser();
    const ast = parser.astify(sql, { database: DB_OPTION[dialect] });
    statements = (Array.isArray(ast) ? ast : [ast]) as unknown as CreateStmt[];
  } catch (e) {
    return {
      diagram: createDiagram(newId(), 'Imported schema', dialect),
      warnings: [`Parse error: ${(e as Error).message}`],
    };
  }

  const tables: NeutralTable[] = [];
  for (const stmt of statements) {
    if (stmt.type === 'create' && stmt.keyword === 'table') {
      const t = toNeutralTable(stmt, warnings);
      if (t) tables.push(t);
    } else if (stmt.type) {
      warnings.push(`Skipped unsupported statement: ${stmt.type} ${stmt.keyword ?? ''}`.trim());
    }
  }

  const schema: NeutralSchema = { tables, warnings };
  const diagram = autoLayout(buildDiagram(schema, dialect));
  return { diagram, warnings: schema.warnings };
}
