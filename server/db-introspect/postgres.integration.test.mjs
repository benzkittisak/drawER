/**
 * Integration test — skipped unless RUN_DB_INTEGRATION=1 and Postgres is reachable.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const postgres = require('./postgres.cjs');

const run = process.env.RUN_DB_INTEGRATION === '1';
const url = process.env.DATABASE_URL || 'postgres://drawer:drawer@localhost:5432/drawer';

function parsePgUrl(raw) {
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'drawer',
  };
}

describe.skipIf(!run)('postgres integration', () => {
  it('lists databases and introspects public schema', async () => {
    process.env.ENABLE_REMOTE_DB_IMPORT = '1';
    process.env.DB_IMPORT_ALLOW_PRIVATE_NET = '1';
    const cfg = parsePgUrl(url);
    const connected = await postgres.connect(cfg);
    expect(connected.databases.length).toBeGreaterThan(0);
    expect(connected.databases).toContain(cfg.database);

    const { neutral } = await postgres.introspect(cfg, cfg.database, 'public', 100);
    expect(Array.isArray(neutral.tables)).toBe(true);
  });
});
