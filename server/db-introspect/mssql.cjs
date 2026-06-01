'use strict';

const sql = require('mssql');
const { timeoutMs } = require('./config.cjs');

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
function sqlConfig(cfg, database) {
  return {
    server: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: database || 'master',
    options: {
      encrypt: Boolean(cfg.ssl),
      trustServerCertificate: true,
    },
    connectionTimeout: timeoutMs(),
    requestTimeout: timeoutMs(),
  };
}

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
async function connect(cfg) {
  const pool = await sql.connect(sqlConfig(cfg, 'master'));
  try {
    const dbRes = await pool.request().query(
      `SELECT name FROM sys.databases
       WHERE database_id > 4 AND state_desc = 'ONLINE'
       ORDER BY name`,
    );
    const databases = dbRes.recordset.map((r) => r.name);
    const verRes = await pool.request().query('SELECT @@VERSION AS v');
    return {
      ok: true,
      databases,
      schemas: ['dbo'],
      serverVersion: verRes.recordset[0]?.v,
      warnings: [],
    };
  } finally {
    await pool.close();
  }
}

/**
 * @param {import('./connection.cjs').NormalizedConnection} cfg
 * @param {string} database
 * @param {string} [schemaName]
 * @param {number} maxTables
 */
async function introspect(cfg, database, schemaName = 'dbo', maxTables) {
  const pool = await sql.connect(sqlConfig(cfg, database));
  const warnings = [];
  const schema = schemaName || 'dbo';
  try {
    const schemaRes = await pool.request().query(
      `SELECT name FROM sys.schemas WHERE name NOT IN ('sys','INFORMATION_SCHEMA','guest')
       ORDER BY name`,
    );
    const schemas = schemaRes.recordset.map((r) => r.name);

    const tablesRes = await pool
      .request()
      .input('schema', sql.NVarChar, schema)
      .input('limit', sql.Int, maxTables)
      .query(
        `SELECT TOP (@limit) t.name AS table_name
         FROM sys.tables t
         INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
         WHERE s.name = @schema
         ORDER BY t.name`,
      );
    if (tablesRes.recordset.length >= maxTables) {
      warnings.push(`Table list truncated at ${maxTables} tables.`);
    }
    const tableNames = tablesRes.recordset.map((r) => r.table_name);
    if (tableNames.length === 0) return { neutral: { tables: [], warnings }, schemas };

    const tables = [];
    for (const tableName of tableNames) {
      const colsRes = await pool
        .request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, tableName)
        .query(
          `SELECT c.name AS column_name, ty.name AS data_type,
                  c.max_length, c.precision, c.scale, c.is_nullable, dc.definition AS col_default,
                  c.is_identity
           FROM sys.columns c
           INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
           INNER JOIN sys.tables t ON c.object_id = t.object_id
           INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
           LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
           WHERE s.name = @schema AND t.name = @table
           ORDER BY c.column_id`,
        );

      const pkRes = await pool
        .request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, tableName)
        .query(
          `SELECT col.name AS column_name
           FROM sys.indexes i
           INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
           INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
           INNER JOIN sys.tables t ON i.object_id = t.object_id
           INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
           WHERE i.is_primary_key = 1 AND s.name = @schema AND t.name = @table`,
        );

      const fkRes = await pool
        .request()
        .input('schema', sql.NVarChar, schema)
        .input('table', sql.NVarChar, tableName)
        .query(
          `SELECT fk.name AS constraint_name, cp.name AS column_name,
                  rt.name AS ref_table, cr.name AS ref_column,
                  fk.delete_referential_action_desc AS delete_rule,
                  fk.update_referential_action_desc AS update_rule
           FROM sys.foreign_keys fk
           INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
           INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
           INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
           INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
           INNER JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id
           INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
           WHERE s.name = @schema AND t.name = @table`,
        );

      const primaryKey = pkRes.recordset.map((r) => r.column_name);
      const columns = colsRes.recordset.map((r) => ({
        name: r.column_name,
        dataType: r.data_type,
        size: r.max_length > 0 ? r.max_length : r.precision ?? undefined,
        scale: r.scale ?? undefined,
        notNull: !r.is_nullable,
        primary: primaryKey.includes(r.column_name),
        unique: false,
        autoIncrement: Boolean(r.is_identity),
        default: r.col_default != null ? String(r.col_default) : undefined,
      }));

      tables.push({
        name: tableName,
        schema,
        columns,
        primaryKey,
        foreignKeys: fkRes.recordset.map((r) => ({
          name: r.constraint_name,
          columns: [r.column_name],
          refTable: r.ref_table,
          refColumns: [r.ref_column],
          onDelete: String(r.delete_rule || '').replace(/_/g, ' '),
          onUpdate: String(r.update_rule || '').replace(/_/g, ' '),
        })),
      });
    }

    return { neutral: { tables, warnings }, schemas };
  } finally {
    await pool.close();
  }
}

module.exports = { connect, introspect };
