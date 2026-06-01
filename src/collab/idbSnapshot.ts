/**
 * Load a diagram snapshot from the browser's y-indexeddb cache (per-diagram room).
 * Used when pushing to the server if localStorage JSON was never written.
 */
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Diagram } from '@core';
import { createDoc, isEmpty } from './ydoc';
import { readDiagram } from './schema';

const roomName = (diagramId: string) => `drawer-${diagramId}`;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('idb timeout')), ms)),
  ]);

export async function loadDiagramFromIndexedDB(diagramId: string): Promise<Diagram | null> {
  const { doc, maps } = createDoc();
  const idb = new IndexeddbPersistence(roomName(diagramId), doc);
  try {
    await withTimeout(idb.whenSynced, 8000);
    if (isEmpty(maps)) return null;
    return readDiagram(maps);
  } finally {
    idb.destroy();
    doc.destroy();
  }
}

/** Diagram ids that have a non-empty IndexedDB room on this browser. */
export async function listIndexedDiagramIds(): Promise<string[]> {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return [];
  try {
    const dbs = await indexedDB.databases();
    return dbs
      .map((d) => d.name)
      .filter((n): n is string => typeof n === 'string' && n.startsWith('drawer-'))
      .map((n) => n.slice('drawer-'.length))
      .filter((id) => id.length > 0);
  } catch {
    return [];
  }
}
