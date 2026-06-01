/**
 * The Yjs document structure for a diagram. One Y.Doc per diagram.
 *
 * Layout (granular where the UI edits, LWW-JSON where it doesn't):
 *   meta           Y.Map   — id, name, dialect, createdAt, updatedAt
 *   tables         Y.Map<tableId, Y.Map>  — table Y.Map has scalars + fields: Y.Array<Y.Map>
 *   relationships  Y.Map<relId, Y.Map>
 *   aux            Y.Map   — notes/areas/customTypes/enums as plain JSON arrays (not concurrently
 *                            edited in the UI yet, so last-writer-wins per collection is fine)
 *
 * The only module that imports `yjs`. UI reaches state through @store hooks.
 */
import * as Y from 'yjs';

/** Stable origin tag for local edits, so UndoManager only undoes our own changes. */
export const LOCAL_ORIGIN: symbol = Symbol('local');

export type YMap = Y.Map<unknown>;
export type YArr = Y.Array<unknown>;

export interface DocMaps {
  meta: YMap;
  tables: Y.Map<YMap>;
  rels: Y.Map<YMap>;
  aux: YMap;
}

export function createDoc(): { doc: Y.Doc; maps: DocMaps } {
  const doc = new Y.Doc();
  const maps: DocMaps = {
    meta: doc.getMap('meta'),
    tables: doc.getMap('tables'),
    rels: doc.getMap('relationships'),
    aux: doc.getMap('aux'),
  };
  return { doc, maps };
}

export function isEmpty(maps: DocMaps): boolean {
  return maps.tables.size === 0 && maps.meta.size === 0;
}
