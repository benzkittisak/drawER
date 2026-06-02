/**
 * Presence over the Yjs Awareness protocol — ephemeral, auto-cleared on disconnect.
 * Cursor positions are stored in CANVAS coordinates (the canvas renders peers inside the
 * pan/zoom-transformed layer, so a canvas-coord point lands correctly for every viewer).
 */
import type { Awareness } from 'y-protocols/awareness';
import { newId } from '@core/id';

export type Activity =
  | { type: 'idle' }
  | { type: 'editing'; tableId: string }
  | { type: 'dragging'; tableId: string; x: number; y: number };

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

export interface PresenceState {
  user: PresenceUser;
  cursor: { x: number; y: number } | null;
  selection: string[];
  activity: Activity;
}

export interface RemotePresence extends PresenceState {
  clientId: number;
}

const PALETTE = ['#f97316', '#2f73e0', '#8b5cf6', '#0f9d6b', '#e0457b', '#d97706', '#0284c7'];
const ADJECTIVES = ['Swift', 'Calm', 'Bright', 'Bold', 'Keen', 'Warm', 'Lucid'];
const ANIMALS = ['Otter', 'Falcon', 'Maple', 'Heron', 'Lynx', 'Koi', 'Wren'];

const IDENTITY_KEY = 'drawer:identity';

/** A stable local identity (name + color), persisted in localStorage. No accounts yet. */
export function getLocalIdentity(): PresenceUser {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) return JSON.parse(raw) as PresenceUser;
  } catch {
    /* ignore */
  }
  const id = newId();
  const n = (s: number) => Math.abs(hash(id + s));
  const user: PresenceUser = {
    id,
    name: `${ADJECTIVES[n(1) % ADJECTIVES.length]} ${ANIMALS[n(2) % ANIMALS.length]}`,
    color: PALETTE[n(3) % PALETTE.length],
  };
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
  return user;
}

/** 2-letter avatar initials for a presence user. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'NA';
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export function setLocalUser(awareness: Awareness, user: PresenceUser): void {
  awareness.setLocalState({ user, cursor: null, selection: [], activity: { type: 'idle' } } satisfies PresenceState);
}

export function setLocalPresence(awareness: Awareness, patch: Partial<PresenceState>): void {
  const cur = (awareness.getLocalState() as PresenceState | null) ?? null;
  if (!cur) return;
  awareness.setLocalState({ ...cur, ...patch });
}

export function readOthers(awareness: Awareness): RemotePresence[] {
  const out: RemotePresence[] = [];
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID) return;
    const s = state as Partial<PresenceState>;
    if (!s.user) return;
    out.push({
      clientId,
      user: s.user,
      cursor: s.cursor ?? null,
      selection: s.selection ?? [],
      activity: s.activity ?? { type: 'idle' },
    });
  });
  return out;
}

export function subscribePresence(awareness: Awareness, cb: (others: RemotePresence[]) => void): () => void {
  const handler = () => cb(readOthers(awareness));
  awareness.on('change', handler);
  handler();
  return () => awareness.off('change', handler);
}
