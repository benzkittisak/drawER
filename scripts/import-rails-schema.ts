/**
 * Rails `schema.rb` → drawDB Live JSON importer.
 *
 * `schema.rb` is a Ruby DSL, so the app's SQL importer (node-sql-parser) can't read it directly.
 * This script parses the DSL into our core `Diagram`, then writes a versioned `SavedDiagram` JSON
 * that imports losslessly via the Dashboard's "Import JSON".
 *
 * Relationships come from two sources, because Rails schemas declare few DB-level FKs:
 *   1. explicit `add_foreign_key "from", "to"` lines, and
 *   2. the Rails convention that a `<entity>_id` column references the `<entities>` table.
 *
 * Usage:  bun run scripts/import-rails-schema.ts [path/to/schema.rb] [out.drawdb.json]
 *
 * Pure-ish: reads a file, writes a file, prints a summary. No app/runtime deps beyond @core.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createDiagram, createField, createRelationship, createTable } from '../src/core/model/factory';
import { newId } from '../src/core/id';
import { autoLayout } from '../src/core/layout/autoLayout';
import { parse, serializeToString } from '../src/core/serialize/json';
import type { Field, Table } from '../src/core/model/types';

const DEFAULT_IN = 'C:/Users/benzk/payrollservice-thailand/db/schema.rb';
const DEFAULT_OUT = 'payroll-thailand.drawdb.json';

// Strip-only color palette for node strips (cycled deterministically by table index).
const PALETTE = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];

/** Rough singularizer for English table names (handles the regular plurals in this schema). */
function singularize(word: string): string {
  if (/ies$/.test(word)) return word.replace(/ies$/, 'y');
  if (/(s|x|z|ch|sh)es$/.test(word)) return word.replace(/es$/, '');
  if (/s$/.test(word)) return word.replace(/s$/, '');
  return word;
}

const intOpt = (opts: string, key: string): number | undefined => {
  const m = opts.match(new RegExp(`${key}:\\s*(\\d+)`));
  return m ? Number(m[1]) : undefined;
};
const hasNotNull = (opts: string): boolean => /null:\s*false/.test(opts);
const commentOf = (opts: string): string | undefined => {
  const m = opts.match(/comment:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1] : undefined;
};

/** Map a Rails column type (+ its option string) to a core catalog type key + size/scale. */
function mapType(railsType: string, opts: string): { type: string; size?: number; scale?: number } {
  switch (railsType) {
    case 'bigint':
      return { type: 'int8' };
    case 'integer': {
      const lim = intOpt(opts, 'limit');
      return { type: lim === 1 || lim === 2 ? 'int2' : 'int4' };
    }
    case 'string':
      return { type: 'varchar', size: intOpt(opts, 'limit') };
    case 'text':
      return { type: 'text' };
    case 'boolean':
      return { type: 'boolean' };
    case 'datetime':
      return { type: 'timestamp' };
    case 'date':
      return { type: 'date' };
    case 'time':
      return { type: 'time' };
    case 'float':
      return { type: 'float8' };
    case 'decimal':
      return { type: 'numeric', size: intOpt(opts, 'precision'), scale: intOpt(opts, 'scale') };
    case 'json':
      return { type: 'json' };
    case 'binary':
      return { type: 'blob' };
    default:
      return { type: 'text' };
  }
}

interface ParsedTable {
  rawName: string;
  table: Table;
  fieldByName: Map<string, Field>;
}

function parseSchema(src: string): { tables: ParsedTable[]; foreignKeys: { from: string; to: string; column?: string }[] } {
  const lines = src.split(/\r?\n/);
  const tables: ParsedTable[] = [];
  const foreignKeys: { from: string; to: string; column?: string }[] = [];

  let current: ParsedTable | null = null;
  let colorIdx = 0;

  for (const line of lines) {
    const createM = line.match(/^\s*create_table\s+"([^"]+)"(.*)\bdo\s*\|t\|/);
    if (createM) {
      const [, rawName, header] = createM;
      const fields: Field[] = [];
      const fieldByName = new Map<string, Field>();
      // Rails adds an implicit bigint PK `id` unless `id: false`.
      if (!/\bid:\s*false/.test(header)) {
        const idField = createField(newId(), 'id', 'int8', { primary: true, autoIncrement: true, notNull: true });
        fields.push(idField);
        fieldByName.set('id', idField);
      }
      const table = createTable(newId(), rawName, { fields, color: PALETTE[colorIdx % PALETTE.length] });
      colorIdx += 1;
      current = { rawName, table, fieldByName };
      tables.push(current);
      continue;
    }

    if (current) {
      if (line.trim() === 'end') {
        current = null;
        continue;
      }
      // Column line: `t.<type> "<name>"[, ...opts]`. Index/constraint lines start with `[`, not `"`.
      const colM = line.match(/^\s*t\.(\w+)\s+"([^"]+)"(.*)$/);
      if (colM && colM[1] !== 'index') {
        const [, railsType, name, opts] = colM;
        const mapped = mapType(railsType, opts);
        const f = createField(newId(), name, mapped.type, {
          size: mapped.size,
          scale: mapped.scale,
          notNull: hasNotNull(opts),
          comment: commentOf(opts),
        });
        current.table.fields.push(f);
        current.fieldByName.set(name, f);
      }
      continue;
    }

    const fkM = line.match(/^\s*add_foreign_key\s+"([^"]+)",\s+"([^"]+)"(.*)$/);
    if (fkM) {
      const [, from, to, rest] = fkM;
      const colM = rest.match(/column:\s*"([^"]+)"/);
      foreignKeys.push({ from, to, column: colM ? colM[1] : undefined });
    }
  }

  return { tables, foreignKeys };
}

async function main(): Promise<void> {
  const inPath = process.argv[2] || DEFAULT_IN;
  const outPath = process.argv[3] || DEFAULT_OUT;

  const src = readFileSync(inPath, 'utf8');
  const { tables, foreignKeys } = parseSchema(src);

  const byRawName = new Map(tables.map((t) => [t.rawName, t]));
  // singular form (and the raw name itself) → table, for resolving `<entity>_id` columns.
  const singularToTable = new Map<string, ParsedTable>();
  for (const t of tables) {
    singularToTable.set(t.rawName, t);
    singularToTable.set(singularize(t.rawName), t);
  }

  /** Resolve a FK column stem (e.g. "client", "acted_user") to a target table. */
  function resolveTarget(stem: string): ParsedTable | null {
    if (singularToTable.has(stem)) return singularToTable.get(stem)!;
    // Prefixed columns (acted_user_id, parent_department_id): drop leading tokens and retry.
    const toks = stem.split('_');
    for (let i = 1; i < toks.length; i += 1) {
      const sub = toks.slice(i).join('_');
      if (singularToTable.has(sub)) return singularToTable.get(sub)!;
    }
    return null;
  }

  const relationships = [];
  const linked = new Set<string>(); // `${fromTable}.${column}` already linked (explicit wins)
  let explicitCount = 0;
  let inferredCount = 0;
  const unresolved: string[] = [];

  // 1) Explicit add_foreign_key — authoritative.
  for (const fk of foreignKeys) {
    const fromT = byRawName.get(fk.from);
    const toT = byRawName.get(fk.to);
    if (!fromT || !toT) continue;
    const column = fk.column ?? `${singularize(fk.to)}_id`;
    let fromField = fromT.fieldByName.get(column);
    if (!fromField) {
      // Column wasn't parsed (shouldn't happen) — synthesize it so the edge has an anchor.
      fromField = createField(newId(), column, 'int8', { notNull: false });
      fromT.table.fields.push(fromField);
      fromT.fieldByName.set(column, fromField);
    }
    const toField = toT.fieldByName.get('id');
    if (!toField) continue;
    relationships.push(
      createRelationship(
        newId(),
        { tableId: fromT.table.id, fieldId: fromField.id },
        { tableId: toT.table.id, fieldId: toField.id },
        { name: `fk_${fk.from}_${column}`, cardinality: 'many_to_one' },
      ),
    );
    linked.add(`${fk.from}.${column}`);
    explicitCount += 1;
  }

  // 2) Convention: every `<entity>_id` column that resolves to a table (and isn't already linked).
  for (const fromT of tables) {
    for (const f of fromT.table.fields) {
      if (f.name === 'id' || !f.name.endsWith('_id')) continue;
      if (linked.has(`${fromT.rawName}.${f.name}`)) continue;
      const stem = f.name.slice(0, -3); // drop "_id"
      const toT = resolveTarget(stem);
      if (!toT) {
        unresolved.push(`${fromT.rawName}.${f.name}`);
        continue;
      }
      if (toT.rawName === fromT.rawName && stem !== singularize(fromT.rawName)) {
        // allow genuine self-refs only when the stem is the table's own singular (e.g. parent_x)
      }
      const toField = toT.table.fields.find((x) => x.name === 'id');
      if (!toField) continue;
      relationships.push(
        createRelationship(
          newId(),
          { tableId: fromT.table.id, fieldId: f.id },
          { tableId: toT.table.id, fieldId: toField.id },
          { name: `fk_${fromT.rawName}_${f.name}`, cardinality: 'many_to_one' },
        ),
      );
      linked.add(`${fromT.rawName}.${f.name}`);
      inferredCount += 1;
    }
  }

  const diagram = createDiagram(newId(), 'Payroll Thailand (Rails import)', 'mysql', Date.now());
  diagram.tables = tables.map((t) => t.table);
  diagram.relationships = relationships;

  const laidOut = await autoLayout(diagram);
  const json = serializeToString(laidOut, new Date().toISOString());

  // Validate the output round-trips through the same parser the app uses on import.
  const reparsed = parse(json);

  writeFileSync(outPath, json, 'utf8');

  const fieldCount = diagram.tables.reduce((n, t) => n + t.fields.length, 0);
  console.log(`✔ Wrote ${outPath}`);
  console.log(`  tables:        ${diagram.tables.length}`);
  console.log(`  fields:        ${fieldCount}`);
  console.log(`  relationships: ${relationships.length}  (explicit FK: ${explicitCount}, inferred *_id: ${inferredCount})`);
  console.log(`  unresolved *_id columns (no matching table, left unlinked): ${unresolved.length}`);
  if (unresolved.length) console.log(`    e.g. ${unresolved.slice(0, 12).join(', ')}${unresolved.length > 12 ? ' …' : ''}`);
  console.log(`  round-trip validation: OK (${reparsed.tables.length} tables parsed back)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
