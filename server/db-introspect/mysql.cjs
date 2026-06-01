'use strict';

const mysql = require('mysql2/promise');
const { timeoutMs } = require('./config.cjs');

const SYSTEM_DBS = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
function baseOpts(cfg, database) {
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database,
    ssl: cfg.ssl ? {} : undefined,
    connectTimeout: timeoutMs(),
  };
}

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
async function connect(cfg) {
  const conn = await mysql.createConnection(baseOpts(cfg, undefined));
  try {
    const [rows] = await conn.query('SHOW DATABASES');
    const databases = rows
      .map((r) => r.Database)
      .filter((name) => name && !SYSTEM_DBS.has(name));
    const [ver] = await conn.query('SELECT VERSION() AS v');
    return {
      ok: true,
      databases,
      schemas: [],
      serverVersion: ver[0]?.v,
      warnings: [],
    };
  } finally {
    await conn.end();
  }
}

/**
 * @param {import('./connection.cjs').NormalizedConnection} cfg
 * @param {string} database
 * @param {string} [_schema]
 * @param {number} maxTables
 */
async function introspect(cfg, database, _schema, maxTables) {
  const conn = await mysql.createConnection(baseOpts(cfg, database));
  const warnings = [];
  try {
    const [tableRows] = await conn.query(
      `SELECT TABLE_NAME AS table_name FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME LIMIT ?`,
      [database, maxTables],
    );
    if (tableRows.length >= maxTables) warnings.push(`Table list truncated at ${maxTables} tables.`);
    const tableNames = tableRows.map((r) => r.table_name);
    if (tableNames.length === 0) return { neutral: { tables: [], warnings }, schemas: [] };

    const placeholders = tableNames.map(() => '?').join(',');
    const [cols] = await conn.query(
      `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type,
              CHARACTER_MAXIMUM_LENGTH AS char_len, NUMERIC_PRECISION AS num_prec,
              NUMERIC_SCALE AS num_scale, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS col_default,
              COLUMN_KEY AS column_key, EXTRA AS extra
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [database, ...tableNames],
    );

    const [pkRows] = await conn.query(
      `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND CONSTRAINT_NAME = 'PRIMARY'
         AND TABLE_NAME IN (${placeholders})`,
      [database, ...tableNames],
    );

    const [fkRows] = await conn.query(
      `SELECT k.TABLE_NAME AS table_name, k.COLUMN_NAME AS column_name,
              k.REFERENCED_TABLE_NAME AS ref_table, k.REFERENCED_COLUMN_NAME AS ref_column,
              k.CONSTRAINT_NAME AS constraint_name, rc.DELETE_RULE AS delete_rule, rc.UPDATE_RULE AS update_rule
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
         ON k.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND k.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
       WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL
         AND k.TABLE_NAME IN (${placeholders})`,
      [database, ...tableNames],
    );

    const pkByTable = new Map();
    for (const r of pkRows) {
      if (!pkByTable.has(r.table_name)) pkByTable.set(r.table_name, []);
      pkByTable.get(r.table_name).push(r.column_name);
    }
    const fkByTable = new Map();
    for (const r of fkRows) {
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
    for (const r of cols) {
      if (!colsByTable.has(r.table_name)) colsByTable.set(r.table_name, []);
      colsByTable.get(r.table_name).push({
        name: r.column_name,
        dataType: r.data_type,
        size: r.char_len ?? r.num_prec ?? undefined,
        scale: r.num_scale ?? undefined,
        notNull: r.is_nullable === 'NO',
        primary: r.column_key === 'PRI',
        unique: r.column_key === 'UNI',
        autoIncrement: String(r.extra || '').includes('auto_increment'),
        default: r.col_default != null ? String(r.col_default) : undefined,
      });
    }

    const tables = tableNames.map((name) => ({
      name,
      columns: colsByTable.get(name) || [],
      primaryKey: pkByTable.get(name) || [],
      foreignKeys: fkByTable.get(name) || [],
    }));

    return { neutral: { tables, warnings }, schemas: [] };
  } finally {
    await conn.end();
  }
}

module.exports = { connect, introspect };
