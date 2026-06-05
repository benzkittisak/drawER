import { describe, expect, it } from 'vitest';
import { createDiagram, createField, createTable } from '../model/factory';
import { diagramToDbml } from '../dbml/export';
import { dbmlToDiagram } from '../dbml/import';
import { diagramToMarkdown } from '../markdown/export';
import { diagramToMermaid } from '../mermaid/export';
import { buildSampleDiagram } from '../sql/__tests__/sampleModel';

const d = buildSampleDiagram();

function arrayDiagram() {
  const a = createDiagram('arr', 'Arr', 'postgres');
  a.tables.push(createTable('t', 't', { fields: [createField('f', 'tags', 'text', { array: true })] }));
  return a;
}

describe('Mermaid export', () => {
  it('emits erDiagram with tables and a parent||--o{child relation', () => {
    const m = diagramToMermaid(d);
    expect(m.startsWith('erDiagram')).toBe(true);
    expect(m).toContain('users {');
    expect(m).toContain('organizations ||--o{ users');
  });
});

describe('Markdown export', () => {
  it('emits a data dictionary with key flags', () => {
    const md = diagramToMarkdown(d);
    expect(md).toContain('# Sample');
    expect(md).toContain('### users');
    expect(md).toContain('| Column | Type | Key | Nullable | Default | Description |');
    expect(md).toMatch(/email .*UQ/);
    expect(md).toContain('## Relationships');
  });
});

describe('array columns', () => {
  it('render with a [] suffix across dbml / mermaid / markdown', () => {
    const a = arrayDiagram();
    expect(diagramToDbml(a)).toContain('tags text[]');
    expect(diagramToMermaid(a)).toContain('text[] tags');
    expect(diagramToMarkdown(a)).toContain('text[]');
  });
});

describe('DBML round-trip', () => {
  it('exports DBML and re-imports the same structure', async () => {
    const dbml = diagramToDbml(d);
    expect(dbml).toContain('Table users {');
    expect(dbml).toContain('Enum user_role {');
    expect(dbml).toMatch(/Ref .*: users\.org_id > organizations\.id/);

    const { diagram, warnings } = await dbmlToDiagram(dbml);
    expect(warnings).toEqual([]);
    expect(diagram.tables.map((t) => t.name).sort()).toEqual(['organizations', 'users']);
    expect(diagram.relationships).toHaveLength(1);
    const users = diagram.tables.find((t) => t.name === 'users')!;
    expect(users.fields.find((f) => f.name === 'id')?.primary).toBe(true);
    expect(users.fields.find((f) => f.name === 'email')?.unique).toBe(true);
  });
});
