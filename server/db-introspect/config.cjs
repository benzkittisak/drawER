'use strict';

function envFlag(name) {
  return process.env[name] === '1' || process.env[name] === 'true';
}

module.exports = {
  isEnabled: () => envFlag('ENABLE_REMOTE_DB_IMPORT'),
  allowPrivateNet: () => envFlag('DB_IMPORT_ALLOW_PRIVATE_NET'),
  maxTables: () => {
    const n = Number(process.env.DB_IMPORT_MAX_TABLES || 500);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 500;
  },
  timeoutMs: () => {
    const n = Number(process.env.DB_IMPORT_TIMEOUT_MS || 15000);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 120000) : 15000;
  },
  DIALECTS: ['postgres', 'mysql', 'mariadb', 'sqlite', 'mssql', 'oracle'],
};
