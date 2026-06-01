import type { Relationship } from './types';

export function relationshipsForTable(rels: Relationship[], tableId: string): Relationship[] {
  return rels.filter((r) => r.fromTableId === tableId || r.toTableId === tableId);
}
