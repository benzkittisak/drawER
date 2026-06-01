'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  Database = null;
}

function requireSqlite() {
  if (!Database) {
    throw new Error('better-sqlite3 is not installed. Re-run bun install on the server.');
  }
  return Database;
}

/** @param {string} filePath */
function introspectFile(filePath, maxTables) {
  const DatabaseCtor = requireSqlite();
  const db = new DatabaseCtor(filePath, { readonly: true });
  const warnings = [];
  try {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name LIMIT ?`,
      )
      .all(maxTables);
    if (tables.length >= maxTables) warnings.push(`Table list truncated at ${maxTables} tables.`);

    const result = [];
    for (const { name } of tables) {
      const cols = db.prepare(`PRAGMA table_info(${quoteId(name)})`).all();
      const fks = db.prepare(`PRAGMA foreign_key_list(${quoteId(name)})`).all();
      const primaryKey = cols.filter((c) => c.pk > 0).map((c) => c.name);
      const foreignKeys = fks.map((fk) => ({
        name: `fk_${name}_${fk.from}`,
        columns: [fk.from],
        refTable: fk.table,
        refColumns: [fk.to],
        onDelete: fk.on_delete,
        onUpdate: fk.on_update,
      }));
      result.push({
        name,
        columns: cols.map((c) => ({
          name: c.name,
          dataType: c.type || 'TEXT',
          notNull: c.notnull === 1,
          primary: c.pk > 0,
          unique: false,
          autoIncrement: String(c.type || '').toUpperCase().includes('INTEGER') && c.pk > 0,
          default: c.dflt_value != null ? String(c.dflt_value) : undefined,
        })),
        primaryKey,
        foreignKeys,
      });
    }
    return { neutral: { tables: result, warnings } };
  } finally {
    db.close();
  }
}

function quoteId(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function connect() {
  return {
    ok: true,
    databases: ['main'],
    schemas: [],
    serverVersion: 'SQLite (file)',
    warnings: ['Upload a .db / .sqlite file to import.'],
  };
}

/**
 * @param {Buffer} data
 * @param {string} [filename]
 * @param {number} maxTables
 */
async function introspectBuffer(data, filename, maxTables) {
  const ext = path.extname(filename || '.db') || '.db';
  const tmp = path.join(os.tmpdir(), `drawer-sqlite-${randomBytes(8).toString('hex')}${ext}`);
  try {
    fs.writeFileSync(tmp, data);
    return introspectFile(tmp, maxTables);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

module.exports = { connect, introspectFile, introspectBuffer };
