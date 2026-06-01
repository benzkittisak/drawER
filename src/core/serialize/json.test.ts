import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { buildSampleDiagram } from '../sql/__tests__/sampleModel';
import { migrate } from './migrate';
import { parse, serialize, serializeToString } from './json';
import { CURRENT_VERSION } from './schema';

const schema = JSON.parse(
  readFileSync(join(process.cwd(), 'schemas', 'saved-diagram.schema.json'), 'utf8'),
);
const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile(schema);

const sample = buildSampleDiagram();

describe('JSON interchange', () => {
  it('serialize() output validates against the published JSON Schema', () => {
    const saved = serialize(sample, '2026-06-01T00:00:00.000Z');
    const ok = validate(saved);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('round-trips losslessly (parse ∘ serialize === identity)', () => {
    expect(parse(serialize(sample))).toEqual(sample);
  });

  it('parses from a JSON string', () => {
    const parsed = parse(serializeToString(sample));
    expect(parsed.tables.map((t) => t.name)).toEqual(['organizations', 'users']);
  });

  it('tolerates a bare diagram (no envelope) and fills optional arrays', () => {
    const bare = { id: 'd', name: 'Bare', dialect: 'sqlite', tables: [], relationships: [] };
    const parsed = parse(bare);
    expect(parsed.notes).toEqual([]);
    expect(parsed.meta).toEqual({ createdAt: 0, updatedAt: 0 });
  });

  it('rejects invalid input', () => {
    expect(() => parse({ id: 'x', name: 'y', dialect: 'nope', tables: 'bad', relationships: [] })).toThrow();
  });

  it('migrate stamps the current version', () => {
    expect(migrate({ version: 1 }).version).toBe(CURRENT_VERSION);
    expect(migrate({}).version).toBe(CURRENT_VERSION);
  });
});
