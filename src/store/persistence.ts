/**
 * Local-first persistence (M4) — diagrams saved as versioned JSON in localStorage, plus a
 * library index that backs the Dashboard. Offline by construction.
 *
 * M5 moves the *live* document to y-indexeddb (CRDT updates); this library index — the list of
 * saved diagrams + metadata — remains. The async-looking API is intentional so the swap to an
 * IndexedDB/Yjs backend later doesn't ripple into callers.
 */
import { parse, serializeToString, type Diagram } from '@core';

const LIBRARY_KEY = 'drawer:library';
const diagramKey = (id: string) => `drawer:diagram:${id}`;

export interface DiagramSummary {
  id: string;
  name: string;
  dialect: string;
  tableCount: number;
  colors: string[];
  updatedAt: number;
}

export function listDiagrams(): DiagramSummary[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    const list = raw ? (JSON.parse(raw) as DiagramSummary[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeLibrary(list: DiagramSummary[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(list));
}

export function loadDiagram(id: string): Diagram | null {
  const raw = localStorage.getItem(diagramKey(id));
  if (!raw) return null;
  try {
    return parse(raw);
  } catch {
    return null;
  }
}

export function saveDiagram(diagram: Diagram, at: number = Date.now()): void {
  try {
    localStorage.setItem(diagramKey(diagram.id), serializeToString(diagram, new Date(at).toISOString()));
  } catch {
    return; // storage full / unavailable — non-fatal
  }
  const summary: DiagramSummary = {
    id: diagram.id,
    name: diagram.name,
    dialect: diagram.dialect,
    tableCount: diagram.tables.length,
    colors: diagram.tables.slice(0, 4).map((t) => t.color ?? 'var(--ink-4)'),
    updatedAt: at,
  };
  writeLibrary([summary, ...listDiagrams().filter((s) => s.id !== diagram.id)]);
}

export function deleteDiagram(id: string): void {
  localStorage.removeItem(diagramKey(id));
  writeLibrary(listDiagrams().filter((s) => s.id !== id));
}
