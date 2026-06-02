/**
 * Persisted "recent custom colors" for the table color picker — a small client-side preference,
 * not diagram data. Stored in localStorage under the shared `drawer:` namespace (same pattern as
 * panel widths in `views/Editor.tsx` and the local identity in `collab/awareness.ts`).
 */
const KEY = 'drawer:recentColors';
const MAX = 8;
const HEX = /^#[0-9a-f]{6}$/;

function normalize(hex: string): string | null {
  const h = hex.trim().toLowerCase();
  return HEX.test(h) ? h : null;
}

export function getRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((c): c is string => c != null).slice(0, MAX);
  } catch {
    return [];
  }
}

/** Move-to-front, dedupe, cap, persist. Returns the new list (or the old one if `hex` is invalid). */
export function addRecentColor(hex: string): string[] {
  const c = normalize(hex);
  if (!c) return getRecentColors();
  const next = [c, ...getRecentColors().filter((x) => x !== c)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
