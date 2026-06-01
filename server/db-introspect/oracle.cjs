'use strict';

const { timeoutMs } = require('./config.cjs');

let oracledb;
try {
  oracledb = require('oracledb');
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
} catch {
  oracledb = null;
}

function requireOracle() {
  if (!oracledb) {
    throw new Error(
      'Oracle driver (oracledb) is not available. Install Oracle Instant Client and oracledb on the sync server.',
    );
  }
  return oracledb;
}

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
function connectAttrs(cfg) {
  return {
    user: cfg.user,
    password: cfg.password,
    connectString:
      cfg.connectString ||
      `${cfg.host}:${cfg.port}/${cfg.database || ''}`,
    connectTimeout: Math.ceil(timeoutMs() / 1000),
  };
}

/** @param {import('./connection.cjs').NormalizedConnection} cfg */
async function connect(cfg) {
  const odb = requireOracle();
  const conn = await odb.getConnection(connectAttrs(cfg));
  try {
    const users = await conn.execute(
      `SELECT username FROM all_users
       WHERE username NOT IN ('SYS','SYSTEM','OUTLN','DBSNMP','APPQOSSYS','WMSYS','XDB','CTXSYS','MDSYS','ORDSYS')
       ORDER BY username`,
    );
    const databases = users.rows?.map((r) => r.USERNAME || r.username) || [];
    const ver = await conn.execute(`SELECT banner FROM v$version WHERE ROWNUM = 1`);
    return {
      ok: true,
      databases,
      schemas: databases,
      serverVersion: ver.rows?.[0]?.BANNER || ver.rows?.[0]?.banner,
      warnings: ['Oracle import is best-effort; verify types after import.'],
    };
  } finally {
    await conn.close();
  }
}

/**
 * @param {import('./connection.cjs').NormalizedConnection} cfg
 * @param {string} schemaUser — Oracle "database" selection maps to schema/user
 * @param {string} [_schema]
 * @param {number} maxTables
 */
async function introspect(cfg, schemaUser, _schema, maxTables) {
  const odb = requireOracle();
  const warnings = ['Oracle import is best-effort; verify types and constraints after import.'];
  const conn = await odb.getConnection({
    ...connectAttrs(cfg),
    user: cfg.user,
    password: cfg.password,
  });
  const owner = (schemaUser || cfg.user || '').toUpperCase();
  try {
    const tablesRes = await conn.execute(
      `SELECT table_name FROM all_tables
       WHERE owner = :owner AND nested = 'NO' AND table_name NOT LIKE 'BIN$%'
       ORDER BY table_name FETCH FIRST :limit ROWS ONLY`,
      { owner, limit: maxTables },
    );
    const tableNames = (tablesRes.rows || []).map((r) => r.TABLE_NAME || r.table_name);
    if (tableNames.length >= maxTables) warnings.push(`Table list truncated at ${maxTables} tables.`);

    const tables = [];
    for (const tableName of tableNames) {
      const colsRes = await conn.execute(
        `SELECT column_name, data_type, data_length, data_precision, data_scale,
                nullable, data_default
         FROM all_tab_columns
         WHERE owner = :owner AND table_name = :tableName
         ORDER BY column_id`,
        { owner, tableName },
      );
      const pkRes = await conn.execute(
        `SELECT cols.column_name
         FROM all_constraints cons
         JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name AND cons.owner = cols.owner
         WHERE cons.constraint_type = 'P' AND cons.owner = :owner AND cons.table_name = :tableName`,
        { owner, tableName },
      );
      const fkRes = await conn.execute(
        `SELECT a.constraint_name, a.column_name, c_pk.table_name AS ref_table, b.column_name AS ref_column,
                a.delete_rule, a.update_rule
         FROM all_cons_columns a
         JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
         JOIN all_constraints c_pk ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
         JOIN all_cons_columns b ON c_pk.owner = b.owner AND c_pk.constraint_name = b.constraint_name AND b.position = a.position
         WHERE c.constraint_type = 'R' AND a.owner = :owner AND c.table_name = :tableName`,
        { owner, tableName },
      );

      const primaryKey = (pkRes.rows || []).map((r) => r.COLUMN_NAME || r.column_name);
      tables.push({
        name: tableName.toLowerCase(),
        schema: owner.toLowerCase(),
        columns: (colsRes.rows || []).map((r) => {
          const name = r.COLUMN_NAME || r.column_name;
          return {
            name: name.toLowerCase(),
            dataType: (r.DATA_TYPE || r.data_type || 'varchar2').toLowerCase(),
            size: r.DATA_LENGTH || r.data_length || r.DATA_PRECISION || undefined,
            scale: r.DATA_SCALE || r.data_scale || undefined,
            notNull: (r.NULLABLE || r.nullable) === 'N',
            primary: primaryKey.includes(name),
            unique: false,
            autoIncrement: false,
            default: r.DATA_DEFAULT != null ? String(r.DATA_DEFAULT) : undefined,
          };
        }),
        primaryKey: primaryKey.map((n) => n.toLowerCase()),
        foreignKeys: (fkRes.rows || []).map((r) => ({
          name: r.CONSTRAINT_NAME || r.constraint_name,
          columns: [(r.COLUMN_NAME || r.column_name).toLowerCase()],
          refTable: (r.REF_TABLE || r.ref_table).toLowerCase(),
          refColumns: [(r.REF_COLUMN || r.ref_column).toLowerCase()],
          onDelete: r.DELETE_RULE || r.delete_rule,
          onUpdate: r.UPDATE_RULE || r.update_rule,
        })),
      });
    }

    return { neutral: { tables, warnings }, schemas: [owner.toLowerCase()] };
  } finally {
    await conn.close();
  }
}

module.exports = { connect, introspect };
