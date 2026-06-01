/**
 * Golden-file regression test: exportSql(sample, <dialect>) must match the committed
 * expected/<dialect>.sql. Regenerate intentional changes with:  UPDATE_GOLDENS=1 npm test
 * (then review the diff). Line endings are normalized so the comparison is OS-independent.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DIALECTS } from '../../model/types';
import { exportSql } from '../export';
import { buildSampleDiagram } from './sampleModel';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, 'golden', 'sample', 'expected');
const UPDATE = !!process.env.UPDATE_GOLDENS;
const lf = (s: string) => s.replace(/\r\n/g, '\n');

const diagram = buildSampleDiagram();

describe('golden DDL', () => {
  for (const dialect of DIALECTS) {
    it(dialect, () => {
      const sql = exportSql(diagram, dialect);
      const file = join(DIR, `${dialect}.sql`);
      if (UPDATE) {
        mkdirSync(DIR, { recursive: true });
        writeFileSync(file, sql);
      }
      expect(existsSync(file), `missing golden ${file} — run UPDATE_GOLDENS=1 npm test`).toBe(true);
      expect(lf(sql)).toBe(lf(readFileSync(file, 'utf8')));
    });
  }
});
