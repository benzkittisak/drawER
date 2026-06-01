/** Deterministic sample diagram exercising enums, FK, auto-increment, sizes, defaults, index. */
import { createDiagram, createField, createIndex, createRelationship, createTable } from '../../model/factory';
import type { Diagram } from '../../model/types';

export function buildSampleDiagram(): Diagram {
  const d = createDiagram('sample', 'Sample', 'postgres');
  d.enums.push({ id: 'e_role', name: 'user_role', values: ['admin', 'member', 'guest'] });

  d.tables.push(
    createTable('orgs', 'organizations', {
      schema: 'public',
      position: { x: 0, y: 0 },
      fields: [
        createField('o_id', 'id', 'int4', { primary: true, autoIncrement: true }),
        createField('o_name', 'name', 'varchar', { size: 120, notNull: true }),
      ],
    }),
    createTable('users', 'users', {
      schema: 'public',
      position: { x: 0, y: 0 },
      fields: [
        createField('u_id', 'id', 'int4', { primary: true, autoIncrement: true }),
        createField('u_org', 'org_id', 'int4', { notNull: true }),
        createField('u_email', 'email', 'varchar', { size: 255, notNull: true, unique: true, comment: 'login email' }),
        createField('u_role', 'role', 'user_role', { notNull: true, default: "'member'" }),
        createField('u_created', 'created_at', 'timestamp', { notNull: true, default: 'CURRENT_TIMESTAMP' }),
      ],
      indices: [createIndex('ix_email', 'ix_users_email', ['u_email'], true)],
    }),
  );

  d.relationships.push(
    createRelationship(
      'r_user_org',
      { tableId: 'users', fieldId: 'u_org' },
      { tableId: 'orgs', fieldId: 'o_id' },
      { name: 'fk_users_org', cardinality: 'many_to_one', onDelete: 'CASCADE' },
    ),
  );

  return d;
}
