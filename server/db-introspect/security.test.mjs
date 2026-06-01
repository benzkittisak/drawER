import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { isPrivateIp } = require('./security.cjs');
const { isEnabled } = require('./config.cjs');

describe('db-introspect security', () => {
  const orig = { ...process.env };

  afterEach(() => {
    process.env = { ...orig };
  });

  it('detects private IPv4 ranges', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.0.0.5')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
  });

  it('isEnabled respects ENABLE_REMOTE_DB_IMPORT', () => {
    delete process.env.ENABLE_REMOTE_DB_IMPORT;
    expect(isEnabled()).toBe(false);
    process.env.ENABLE_REMOTE_DB_IMPORT = '1';
    expect(isEnabled()).toBe(true);
  });
});
