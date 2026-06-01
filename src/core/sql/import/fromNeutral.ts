/**
 * Import a diagram from a neutral schema (remote DB introspect or other non-SQL sources).
 */
import { autoLayout } from '../../layout/autoLayout';
import type { DialectId } from '../../model/types';
import type { NeutralSchema } from '../ast';
import { buildDiagramFromNeutral } from './buildDiagram';
import type { ImportResult } from './parse';

export async function importFromNeutralSchema(
  schema: NeutralSchema,
  dialect: DialectId,
): Promise<ImportResult> {
  const warnings = [...schema.warnings];
  if (dialect === 'oracle') {
    warnings.push('Oracle import is best-effort; verify types and constraints after import.');
  }
  const diagram = await autoLayout(buildDiagramFromNeutral({ ...schema, warnings }, dialect));
  return { diagram, warnings };
}
