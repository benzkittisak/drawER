/**
 * Lightweight runtime validation for the domain model. Used on import/parse to reject
 * malformed data before it reaches the editor or the SQL engine.
 */
import type { Diagram } from './types';
import { DIALECTS } from './types';

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isPosition(x: unknown): boolean {
  return isObj(x) && typeof x.x === 'number' && typeof x.y === 'number';
}

/**
 * Structural validation. Returns a list of human-readable problems (empty = valid).
 * Intentionally pragmatic — the JSON Schema is the exhaustive contract; this catches the
 * shape errors that would crash the editor.
 */
export function validateDiagram(d: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(d)) return ['diagram is not an object'];
  if (typeof d.id !== 'string') errors.push('diagram.id must be a string');
  if (typeof d.name !== 'string') errors.push('diagram.name must be a string');
  if (typeof d.dialect !== 'string' || !DIALECTS.includes(d.dialect as never)) {
    errors.push(`diagram.dialect must be one of ${DIALECTS.join(', ')}`);
  }
  if (!Array.isArray(d.tables)) errors.push('diagram.tables must be an array');
  else
    d.tables.forEach((t, i) => {
      if (!isObj(t)) return errors.push(`tables[${i}] is not an object`);
      if (typeof t.id !== 'string') errors.push(`tables[${i}].id must be a string`);
      if (typeof t.name !== 'string') errors.push(`tables[${i}].name must be a string`);
      if (!isPosition(t.position)) errors.push(`tables[${i}].position must be {x,y}`);
      if (!Array.isArray(t.fields)) errors.push(`tables[${i}].fields must be an array`);
    });
  if (!Array.isArray(d.relationships)) errors.push('diagram.relationships must be an array');
  return errors;
}

export function isDiagram(d: unknown): d is Diagram {
  return validateDiagram(d).length === 0;
}
