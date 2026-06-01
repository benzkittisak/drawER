/** Append-only activity feed in the Yjs doc. Entries are plain JSON values. */
import type { DocMaps } from './ydoc';

export interface ActivityEntry {
  id: string;
  who: string;
  whoName: string;
  whoColor: string;
  action: string;
  target: string;
  ts: number;
}

export function pushActivity(maps: DocMaps, entry: ActivityEntry): void {
  maps.activity.push([entry]);
}

/** Newest-first, capped. */
export function readActivity(maps: DocMaps, limit = 40): ActivityEntry[] {
  const all = maps.activity.toArray() as ActivityEntry[];
  return all.slice(-limit).reverse();
}
