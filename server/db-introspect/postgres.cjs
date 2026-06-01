'use strict';

const { Pool } = require('pg');
const { timeoutMs } = require('./config.cjs');

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
function poolConfig(cfg, database) {
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: database || cfg.database || 'postgres',
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: timeoutMs(),
    query_timeout: timeoutMs(),
    statement_timeout: timeoutMs(),
  };
}

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
async function connect(cfg) {
  const pool = new Pool(poolConfig(cfg, 'postgres'));
  try {
    const dbRes = await pool.query(
      `SELECT datname FROM pg_database
       WHERE datistemplate = false AND datallowconn
       ORDER BY datname`,
    );
    const databases = dbRes.rows.map((r) => r.datname);
    const schemaRes = await pool.query(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
         AND schema_name NOT LIKE 'pg_toast%'
       ORDER BY schema_name`,
    );
    const verRes = await pool.query('SELECT version() AS v');
    return {
      ok: true,
      databases,
      schemas: schemaRes.rows.map((r) => r.schema_name),
      serverVersion: verRes.rows[0]?.v,
      warnings: [],
    };
  } finally {
    await pool.end();
  }
}

/**
 * @param {import('./connection.cjs').NormalizedConnection} cfg
 * @param {string} database
 * @param {string} [schemaName]
 * @param {number} maxTables
 */
async function introspect(cfg, database, schemaName = 'public', maxTables) {
  const pool = new Pool(poolConfig(cfg, database));
  const warnings = [];
  try {
    const schemaRes = await pool.query(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
         AND schema_name NOT LIKE 'pg_toast%'
       ORDER BY schema_name`,
    );
    const schemas = schemaRes.rows.map((r) => r.schema_name);
    const schema = schemaName || 'public';

    const tablesRes = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name LIMIT $2`,
      [schema, maxTables],
    );
    if (tablesRes.rows.length >= maxTables) {
      warnings.push(`Table list truncated at ${maxTables} tables.`);
    }
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    if (tableNames.length === 0) {
      return { neutral: { tables: [], warnings }, schemas };
    }

    const colsRes = await pool.query(
      `SELECT table_name, column_name, data_type, udt_name,
              character_maximum_length, numeric_precision, numeric_scale,
              is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = ANY($2::text[])
       ORDER BY table_name, ordinal_position`,
      [schema, tableNames],
    );

    const pkRes = await pool.query(
      `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = $1
         AND tc.table_name = ANY($2::text[])`,
      [schema, tableNames],
    );

    const fkRes = await pool.query(
      `SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table,
              ccu.column_name AS ref_column, tc.constraint_name,
              rc.delete_rule, rc.update_rule
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       JOIN information_schema.referential_constraints rc
         ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1
         AND tc.table_name = ANY($2::text[])`,
      [schema, tableNames],
    );

    const uniqueRes = await pool.query(
      `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = $1
         AND tc.table_name = ANY($2::text[])`,
      [schema, tableNames],
    );

    const pkByTable = new Map();
    for (const r of pkRes.rows) {
      if (!pkByTable.has(r.table_name)) pkByTable.set(r.table_name, []);
      pkByTable.get(r.table_name).push(r.column_name);
    }
    const uniqueSet = new Set(uniqueRes.rows.map((r) => `${r.table_name}.${r.column_name}`));
    const fkByTable = new Map();
    for (const r of fkRes.rows) {
      if (!fkByTable.has(r.table_name)) fkByTable.set(r.table_name, []);
      fkByTable.get(r.table_name).push({
        name: r.constraint_name,
        columns: [r.column_name],
        refTable: r.ref_table,
        refColumns: [r.ref_column],
        onDelete: r.delete_rule,
        onUpdate: r.update_rule,
      });
    }

    const colsByTable = new Map();
    for (const r of colsRes.rows) {
      if (!colsByTable.has(r.table_name)) colsByTable.set(r.table_name, []);
      const dataType = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
      const def = r.column_default || '';
      const autoIncrement = /nextval\s*\(/i.test(def);
      colsByTable.get(r.table_name).push({
        name: r.column_name,
        dataType,
        size: r.character_maximum_length ?? r.numeric_precision ?? undefined,
        scale: r.numeric_scale ?? undefined,
        notNull: r.is_nullable === 'NO',
        primary: pkByTable.get(r.table_name)?.includes(r.column_name) ?? false,
        unique: uniqueSet.has(`${r.table_name}.${r.column_name}`),
        autoIncrement,
        default: def || undefined,
      });
    }

    const tables = tableNames.map((name) => ({
      name,
      schema,
      columns: colsByTable.get(name) || [],
      primaryKey: pkByTable.get(name) || [],
      foreignKeys: fkByTable.get(name) || [],
    }));

    return { neutral: { tables, warnings }, schemas };
  } finally {
    await pool.end();
  }
}

module.exports = { connect, introspect };
