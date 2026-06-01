import { describe, expect, it } from 'vitest';
import { exportSql } from '../export';
import { importSql } from '../import/parse';
import { buildSampleDiagram } from './sampleModel';

const MYSQL_SCHEMA = `
CREATE TABLE \`orgs\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(120) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB;

CREATE TABLE \`users\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`org_id\` INT NOT NULL,
  \`email\` VARCHAR(255) NOT NULL UNIQUE,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_users_org\` FOREIGN KEY (\`org_id\`) REFERENCES \`orgs\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

describe('SQL import', () => {
  it('parses tables, columns, keys, and a foreign key', async () => {
    const { diagram, warnings } = await importSql(MYSQL_SCHEMA, 'mysql');
    expect(warnings).toEqual([]);
    expect(diagram.tables.map((t) => t.name).sort()).toEqual(['orgs', 'users']);

    const users = diagram.tables.find((t) => t.name === 'users')!;
    expect(users.fields.map((f) => f.name)).toEqual(['id', 'org_id', 'email']);
    const id = users.fields[0];
    expect(id.primary).toBe(true);
    expect(id.autoIncrement).toBe(true);
    expect(id.type).toBe('int4');
    expect(users.fields[2].unique).toBe(true);
    expect(users.fields[2].size).toBe(255);

    expect(diagram.relationships).toHaveLength(1);
    const rel = diagram.relationships[0];
    expect(rel.onDelete).toBe('CASCADE');
    const orgs = diagram.tables.find((t) => t.name === 'orgs')!;
    expect(rel.fromTableId).toBe(users.id);
    expect(rel.toTableId).toBe(orgs.id);
  });

  it('auto-layout assigns distinct positions', async () => {
    const { diagram } = await importSql(MYSQL_SCHEMA, 'mysql');
    const [a, b] = diagram.tables;
    expect(a.position).not.toEqual(b.position);
  });

  it('round-trips structure through export → import (mysql, inline FKs)', async () => {
    const sample = buildSampleDiagram();
    const sql = exportSql(sample, 'mysql', { inlineForeignKeys: true });
    const { diagram } = await importSql(sql, 'mysql');
    expect(diagram.tables.map((t) => t.name).sort()).toEqual(['organizations', 'users']);
    expect(diagram.relationships).toHaveLength(1);
  });
});
