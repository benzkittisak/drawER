/**
 * Local-first persistence (M4) — diagrams saved as versioned JSON in localStorage, plus a
 * library index that backs the Dashboard. The server PostgreSQL DB is the cross-device
 * source of truth for the library list and Yjs document bytes (via sync + REST push).
 */
import { encodeDiagramState } from '@collab';
import { parse, serializeToString, type Diagram } from '@core';

const LIBRARY_KEY = 'drawer:library';
/** @deprecated tombstones are cleared on sync; Postgres is the library source of truth */
const TOMBSTONES_KEY = 'drawer:tombstones';
const diagramKey = (id: string) => `drawer:diagram:${id}`;
const idbName = (id: string) => `drawer-${id}`;

const wsUrl = (import.meta.env.VITE_SYNC_URL as string | undefined) || 'ws://localhost:1234';

/**
 * HTTP base for the sync REST API.
 * - Dev: same-origin `/api` (Vite proxies to the sync container / local :1234).
 * - Prod: same-origin `/api` when nginx proxies (Docker), else host from VITE_SYNC_URL.
 */
export function syncHttpBase(): string {
  if (import.meta.env.DEV) return '';
  if (typeof window !== 'undefined') return window.location.origin;
  return wsUrl.replace(/^ws/, 'http');
}

const api = (path: string) => `${syncHttpBase()}${path}`;

let refreshInFlight: Promise<LibrarySyncResult> | null = null;

function clearLegacyTombstones(): void {
  localStorage.removeItem(TOMBSTONES_KEY);
}

export interface DiagramSummary {
  id: string;
  name: string;
  dialect: string;
  tableCount: number;
  colors: string[];
  updatedAt: number;
}

export interface LibrarySyncResult {
  diagrams: DiagramSummary[];
  serverReachable: boolean;
  error?: string;
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

/** Merge local library with PostgreSQL list (server rows always win over stale local hides). */
export function mergeDiagramSummaries(remoteList: DiagramSummary[] | null): DiagramSummary[] {
  const byId = new Map<string, DiagramSummary>();
  for (const d of listDiagrams()) byId.set(d.id, d);
  if (remoteList) {
    for (const d of remoteList) {
      const local = byId.get(d.id);
      const pick = !local || d.updatedAt >= local.updatedAt ? d : local;
      byId.set(d.id, { ...pick, colors: local?.colors.length ? local.colors : pick.colors });
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function writeLibrary(list: DiagramSummary[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(list));
}

function summaryFromDiagram(diagram: Diagram, at: number): DiagramSummary {
  return {
    id: diagram.id,
    name: diagram.name,
    dialect: diagram.dialect,
    tableCount: diagram.tables.length,
    colors: diagram.tables.slice(0, 4).map((t) => t.color ?? 'var(--ink-4)'),
    updatedAt: at,
  };
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Upload diagram metadata + Yjs state so other browsers/devices see it in the library. */
export async function pushDiagramToServer(diagram: Diagram, summary: DiagramSummary): Promise<boolean> {
  try {
    const state = bytesToBase64(encodeDiagramState(diagram));
    const res = await fetch(api(`/api/diagrams/${encodeURIComponent(summary.id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: summary.name,
        dialect: summary.dialect,
        tableCount: summary.tableCount,
        updatedAt: summary.updatedAt,
        state,
      }),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/** Push library entries that have localStorage JSON and are missing or newer on the server. */
async function syncLocalLibraryToServer(remote: DiagramSummary[]): Promise<number> {
  const remoteById = new Map(remote.map((d) => [d.id, d]));
  let pushed = 0;
  for (const summary of listDiagrams()) {
    const remoteRow = remoteById.get(summary.id);
    if (remoteRow && remoteRow.updatedAt >= summary.updatedAt) continue;
    const diagram = loadDiagram(summary.id);
    if (!diagram) continue;
    if (await pushDiagramToServer(diagram, summary)) pushed += 1;
  }
  return pushed;
}

export async function fetchServerDiagramSummaries(): Promise<{
  rows: DiagramSummary[] | null;
  error?: string;
}> {
  const url = api('/api/diagrams');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { rows: null, error: `HTTP ${res.status} from ${url || '/api/diagrams'}${body ? `: ${body.slice(0, 80)}` : ''}` };
    }
    const rows = (await res.json()) as {
      id: string;
      name: string;
      dialect: string;
      tableCount: number;
      updatedAt: number;
    }[];
    return {
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        dialect: r.dialect,
        tableCount: r.tableCount,
        colors: [] as string[],
        updatedAt: r.updatedAt,
      })),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { rows: null, error: `${msg} (${url || '/api/diagrams'})` };
  }
}

async function runRefresh(): Promise<LibrarySyncResult> {
  let error: string | undefined;
  const first = await fetchServerDiagramSummaries();
  let remote = first.rows;

  // Guard `remote` directly (not via a `serverReachable` alias): `remote` is reassigned below, so
  // TS won't carry an aliased-boolean narrowing — but a direct null check narrows it for the
  // `serverList` assignment that follows.
  if (remote == null) {
    return {
      diagrams: mergeDiagramSummaries(null),
      serverReachable: false,
      error: first.error,
    };
  }

  clearLegacyTombstones();

  const serverList = remote;
  try {
    await syncLocalLibraryToServer(serverList);
    const again = await fetchServerDiagramSummaries();
    if (again.rows) remote = again.rows;
    else if (again.error) error = again.error;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Sync failed';
  }

  const diagrams = mergeDiagramSummaries(remote ?? serverList);
  writeLibrary(diagrams);
  return {
    diagrams,
    serverReachable: true,
    error,
  };
}

/** Fetch server list, merge with local, persist library (runs on Dashboard load / refresh). */
export function refreshDiagramLibrary(): Promise<LibrarySyncResult> {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function saveDiagram(diagram: Diagram, at: number = Date.now()): void {
  try {
    localStorage.setItem(diagramKey(diagram.id), serializeToString(diagram, new Date(at).toISOString()));
  } catch {
    return;
  }
  const summary = summaryFromDiagram(diagram, at);
  writeLibrary([summary, ...listDiagrams().filter((s) => s.id !== diagram.id)]);
  void pushDiagramToServer(diagram, summary);
}

/** Remove from PostgreSQL first; only then clear this browser's cache. */
export async function deleteDiagram(id: string): Promise<boolean> {
  try {
    const res = await fetch(api(`/api/diagrams/${encodeURIComponent(id)}`), { method: 'DELETE' });
    if (!res.ok && res.status !== 204) return false;
  } catch {
    return false;
  }
  localStorage.removeItem(diagramKey(id));
  writeLibrary(listDiagrams().filter((s) => s.id !== id));
  if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase(idbName(id));
  return true;
}
