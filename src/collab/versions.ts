/**
 * Local version history — named snapshots of the live doc (Y.encodeStateAsUpdate) stored in
 * localStorage, with structural diffs and restore. Authorship uses the local identity.
 * (Server-persisted, team-wide history is part of the deferred backend, M7.)
 */
import type { Diagram } from '@core';
import { decodeDiagramSnapshot, session } from './session';
import type { PresenceUser } from './awareness';

export interface VersionMeta {
  id: string;
  label: string;
  author: string;
  authorColor: string;
  ts: number;
}
interface StoredVersion extends VersionMeta {
  update: string; // base64 Yjs update
}

export type DiffKind = 'add' | 'mod' | 'del';
export interface DiffTag {
  t: DiffKind;
  l: string;
}

const key = (diagramId: string) => `drawer:versions:${diagramId}`;

function b64encode(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function read(diagramId: string): StoredVersion[] {
  try {
    return JSON.parse(localStorage.getItem(key(diagramId)) ?? '[]') as StoredVersion[];
  } catch {
    return [];
  }
}

export function listVersions(diagramId: string): VersionMeta[] {
  return read(diagramId)
    .map(({ update: _u, ...meta }) => meta)
    .sort((a, b) => b.ts - a.ts);
}

export function saveVersion(diagramId: string, label: string, author: PresenceUser, at = Date.now()): VersionMeta | null {
  const update = session.getStateUpdate();
  if (!update) return null;
  const v: StoredVersion = {
    id: crypto.randomUUID(),
    label,
    author: author.name,
    authorColor: author.color,
    ts: at,
    update: b64encode(update),
  };
  const all = [...read(diagramId), v];
  try {
    localStorage.setItem(key(diagramId), JSON.stringify(all));
  } catch {
    return null;
  }
  const { update: _u, ...meta } = v;
  return meta;
}

export function restoreVersion(diagramId: string, versionId: string): boolean {
  const v = read(diagramId).find((x) => x.id === versionId);
  if (!v) return false;
  session.restoreDiagram(decodeDiagramSnapshot(b64decode(v.update)));
  return true;
}

/** Structural diff of a saved version against `current`. */
export function diffVersion(diagramId: string, versionId: string, current: Diagram): DiffTag[] {
  const v = read(diagramId).find((x) => x.id === versionId);
  if (!v) return [];
  const snap = decodeDiagramSnapshot(b64decode(v.update));
  const tags: DiffTag[] = [];

  const curT = new Map(current.tables.map((t) => [t.id, t]));
  const snapT = new Map(snap.tables.map((t) => [t.id, t]));
  const addedT = current.tables.filter((t) => !snapT.has(t.id)).length;
  const delT = snap.tables.filter((t) => !curT.has(t.id)).length;
  const modT = current.tables.filter((t) => {
    const s = snapT.get(t.id);
    return s && (s.fields.length !== t.fields.length || s.name !== t.name);
  }).length;
  if (addedT) tags.push({ t: 'add', l: `+${addedT} ${addedT === 1 ? 'table' : 'tables'}` });
  if (modT) tags.push({ t: 'mod', l: `~${modT} ${modT === 1 ? 'table' : 'tables'}` });
  if (delT) tags.push({ t: 'del', l: `-${delT} ${delT === 1 ? 'table' : 'tables'}` });

  const relDelta = current.relationships.length - snap.relationships.length;
  if (relDelta > 0) tags.push({ t: 'add', l: `+${relDelta} ${relDelta === 1 ? 'relation' : 'relations'}` });
  else if (relDelta < 0) tags.push({ t: 'del', l: `${relDelta} relations` });

  return tags.length ? tags : [{ t: 'mod', l: 'no structural change' }];
}
