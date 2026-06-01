/**
 * Demo/seed view-model types — typed port of docs/design-reference/data.js.
 *
 * NOTE: this is the prototype's view/seed shape used to render the static views in M0.
 * The canonical domain model lives in src/core/model (added in M1); the editor canvas
 * will bind to that via @store. Keep these isolated to src/data.
 */

export interface DemoUser {
  id: string;
  name: string;
  short: string;
  color: string; // CSS color or var()
  role: string;
}

export interface DemoField {
  id: string;
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
  notNull?: boolean;
}

export interface DemoTable {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  fields: DemoField[];
}

/** [tableId, fieldId] */
export type FieldRef = [string, string];

export interface DemoRel {
  id: string;
  from: FieldRef;
  to: FieldRef;
  card: string; // "n:1", "1:1", …
}

export interface DemoComment {
  id: string;
  x: number;
  y: number;
  table: string;
  resolved: boolean;
  author: string;
  msg: string;
  time: string;
  replies: number;
  isNew?: boolean;
}

export interface DemoActivity {
  id: string;
  who: string;
  action: string;
  target: string;
  time: string;
  live?: boolean;
}

export type DiffKind = 'add' | 'mod' | 'del';

export interface DemoVersion {
  id: string;
  label: string;
  who: string;
  time: string;
  current?: boolean;
  diffs: { t: DiffKind; l: string }[];
}

export interface DemoDiagram {
  id: string;
  name: string;
  db: string;
  tables: number;
  edited: string;
  live: string[];
  colors: string[];
}

/** A teammate's live presence (cursor target + which table they're viewing). */
export interface LiveUser {
  id: string;
  viewing: string;
}
