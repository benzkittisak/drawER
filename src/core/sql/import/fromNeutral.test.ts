import { describe, expect, it } from 'vitest';
import type { NeutralSchema } from '../ast';
import { importFromNeutralSchema } from './fromNeutral';

const FIXTURE: NeutralSchema = {
  warnings: [],
  tables: [
    {
      name: 'orgs',
      columns: [
        { name: 'id', dataType: 'integer', notNull: true, primary: true, unique: false, autoIncrement: true },
        { name: 'name', dataType: 'varchar', size: 120, notNull: true, primary: false, unique: false, autoIncrement: false },
      ],
      primaryKey: ['id'],
      foreignKeys: [],
    },
    {
      name: 'users',
      columns: [
        { name: 'id', dataType: 'integer', notNull: true, primary: true, unique: false, autoIncrement: true },
        { name: 'org_id', dataType: 'integer', notNull: true, primary: false, unique: false, autoIncrement: false },
      ],
      primaryKey: ['id'],
      foreignKeys: [
        {
          columns: ['org_id'],
          refTable: 'orgs',
          refColumns: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    },
  ],
};

describe('importFromNeutralSchema', () => {
  it('builds tables, fields, and relationships', async () => {
    const { diagram, warnings } = await importFromNeutralSchema(FIXTURE, 'postgres');
    expect(warnings).toEqual([]);
    expect(diagram.tables.map((t) => t.name).sort()).toEqual(['orgs', 'users']);
    expect(diagram.relationships).toHaveLength(1);
    expect(diagram.relationships[0].onDelete).toBe('CASCADE');
  });

  it('auto-layout assigns distinct positions', async () => {
    const { diagram } = await importFromNeutralSchema(FIXTURE, 'postgres');
    const [a, b] = diagram.tables;
    expect(a.position).not.toEqual(b.position);
  });
});
