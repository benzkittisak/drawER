/**
 * Seed data for the static views — typed port of docs/design-reference/data.js.
 * Replaced by real local-first / collaborative state in M4–M6.
 */
import type {
  DemoActivity,
  DemoComment,
  DemoDiagram,
  DemoRel,
  DemoTable,
  DemoUser,
  DemoVersion,
  LiveUser,
} from './types';

export const users: Record<string, DemoUser> = {
  you: { id: 'you', name: 'You', short: 'ME', color: 'var(--u-you)', role: 'Owner' },
  maya: { id: 'maya', name: 'Maya Lindqvist', short: 'ML', color: 'var(--u-maya)', role: 'Backend' },
  kenji: { id: 'kenji', name: 'Kenji Watanabe', short: 'KW', color: 'var(--u-kenji)', role: 'Data eng.' },
  aisha: { id: 'aisha', name: 'Aisha Rahman', short: 'AR', color: 'var(--u-aisha)', role: 'PM' },
  leo: { id: 'leo', name: 'Leo Fontaine', short: 'LF', color: 'var(--u-leo)', role: 'Designer' },
};

/** Table accent colors. */
export const C = {
  indigo: '#6366f1',
  teal: '#0d9488',
  amber: '#d97706',
  rose: '#e11d48',
  violet: '#7c3aed',
  sky: '#0284c7',
  green: '#16a34a',
} as const;

export const tables: DemoTable[] = [
  {
    id: 'users', name: 'users', color: C.indigo, x: 80, y: 90,
    fields: [
      { id: 'u_id', name: 'id', type: 'uuid', pk: true },
      { id: 'u_org', name: 'org_id', type: 'uuid', fk: true },
      { id: 'u_email', name: 'email', type: 'varchar', notNull: true },
      { id: 'u_name', name: 'full_name', type: 'varchar' },
      { id: 'u_role', name: 'role', type: 'enum' },
      { id: 'u_created', name: 'created_at', type: 'timestamp' },
    ],
  },
  {
    id: 'orgs', name: 'organizations', color: C.violet, x: 80, y: 360,
    fields: [
      { id: 'o_id', name: 'id', type: 'uuid', pk: true },
      { id: 'o_name', name: 'name', type: 'varchar', notNull: true },
      { id: 'o_slug', name: 'slug', type: 'varchar' },
      { id: 'o_plan', name: 'plan', type: 'enum' },
      { id: 'o_created', name: 'created_at', type: 'timestamp' },
    ],
  },
  {
    id: 'projects', name: 'projects', color: C.teal, x: 430, y: 80,
    fields: [
      { id: 'p_id', name: 'id', type: 'uuid', pk: true },
      { id: 'p_org', name: 'org_id', type: 'uuid', fk: true },
      { id: 'p_owner', name: 'owner_id', type: 'uuid', fk: true },
      { id: 'p_name', name: 'name', type: 'varchar', notNull: true },
      { id: 'p_status', name: 'status', type: 'enum' },
      { id: 'p_archived', name: 'is_archived', type: 'boolean' },
    ],
  },
  {
    id: 'tasks', name: 'tasks', color: C.amber, x: 770, y: 70,
    fields: [
      { id: 't_id', name: 'id', type: 'uuid', pk: true },
      { id: 't_proj', name: 'project_id', type: 'uuid', fk: true },
      { id: 't_assignee', name: 'assignee_id', type: 'uuid', fk: true },
      { id: 't_title', name: 'title', type: 'varchar', notNull: true },
      { id: 't_done', name: 'completed', type: 'boolean' },
      { id: 't_due', name: 'due_date', type: 'date' },
      { id: 't_prio', name: 'priority', type: 'int2' },
    ],
  },
  {
    id: 'subs', name: 'subscriptions', color: C.green, x: 430, y: 380,
    fields: [
      { id: 's_id', name: 'id', type: 'uuid', pk: true },
      { id: 's_org', name: 'org_id', type: 'uuid', fk: true },
      { id: 's_status', name: 'status', type: 'enum' },
      { id: 's_seats', name: 'seats', type: 'int4' },
      { id: 's_renews', name: 'renews_at', type: 'timestamp' },
    ],
  },
  {
    id: 'invoices', name: 'invoices', color: C.sky, x: 770, y: 400,
    fields: [
      { id: 'i_id', name: 'id', type: 'uuid', pk: true },
      { id: 'i_sub', name: 'subscription_id', type: 'uuid', fk: true },
      { id: 'i_amount', name: 'amount_cents', type: 'int4' },
      { id: 'i_paid', name: 'paid', type: 'boolean' },
      { id: 'i_issued', name: 'issued_at', type: 'timestamp' },
    ],
  },
];

export const rels: DemoRel[] = [
  { id: 'r1', from: ['users', 'u_org'], to: ['orgs', 'o_id'], card: 'n:1' },
  { id: 'r2', from: ['projects', 'p_org'], to: ['orgs', 'o_id'], card: 'n:1' },
  { id: 'r3', from: ['projects', 'p_owner'], to: ['users', 'u_id'], card: 'n:1' },
  { id: 'r4', from: ['tasks', 't_proj'], to: ['projects', 'p_id'], card: 'n:1' },
  { id: 'r5', from: ['tasks', 't_assignee'], to: ['users', 'u_id'], card: 'n:1' },
  { id: 'r6', from: ['subs', 's_org'], to: ['orgs', 'o_id'], card: '1:1' },
  { id: 'r7', from: ['invoices', 'i_sub'], to: ['subs', 's_id'], card: 'n:1' },
];

/** Advisory locks: tableId -> userId currently editing. */
export const locks: Record<string, string> = { tasks: 'kenji' };

export const liveUsers: LiveUser[] = [
  { id: 'maya', viewing: 'projects' },
  { id: 'kenji', viewing: 'tasks' },
  { id: 'aisha', viewing: 'subs' },
];

export const comments: DemoComment[] = [
  { id: 'c1', x: 905, y: 60, table: 'tasks', resolved: false, author: 'aisha', replies: 2, time: '12m',
    msg: 'Should priority be an enum (low/med/high) instead of int2? Easier for non-devs to read.' },
  { id: 'c2', x: 610, y: 360, table: 'subs', resolved: false, author: 'maya', replies: 1, time: '1h',
    msg: 'We need a trial_ends_at column before launch — adding now.' },
  { id: 'c3', x: 300, y: 80, table: 'users', resolved: true, author: 'kenji', replies: 4, time: '3h',
    msg: 'Confirmed email should be unique + indexed. ✅' },
];

export const activity: DemoActivity[] = [
  { id: 'a1', who: 'kenji', action: 'is editing', target: 'tasks', time: 'now', live: true },
  { id: 'a2', who: 'maya', action: 'added field', target: 'subscriptions.seats', time: '4m' },
  { id: 'a3', who: 'aisha', action: 'commented on', target: 'tasks', time: '12m' },
  { id: 'a4', who: 'you', action: 'linked', target: 'invoices → subscriptions', time: '26m' },
  { id: 'a5', who: 'maya', action: 'created table', target: 'subscriptions', time: '1h' },
  { id: 'a6', who: 'kenji', action: 'renamed', target: 'members → users', time: '2h' },
  { id: 'a7', who: 'you', action: 'imported', target: 'schema.sql (4 tables)', time: '3h' },
];

export const versions: DemoVersion[] = [
  { id: 'v6', label: 'Billing model added', who: 'maya', time: 'Today, 14:20', current: true,
    diffs: [{ t: 'add', l: '+2 tables' }, { t: 'add', l: '+3 relations' }] },
  { id: 'v5', label: 'Renamed members → users', who: 'kenji', time: 'Today, 11:05',
    diffs: [{ t: 'mod', l: '~1 table' }, { t: 'mod', l: '~6 fields' }] },
  { id: 'v4', label: 'Task priority + due dates', who: 'you', time: 'Yesterday, 17:42',
    diffs: [{ t: 'add', l: '+2 fields' }] },
  { id: 'v3', label: 'Project ownership FK', who: 'aisha', time: 'Yesterday, 09:18',
    diffs: [{ t: 'add', l: '+1 relation' }, { t: 'mod', l: '~1 table' }] },
  { id: 'v2', label: 'Initial org + project', who: 'you', time: 'Mon, 16:00',
    diffs: [{ t: 'add', l: '+3 tables' }] },
  { id: 'v1', label: 'Created diagram', who: 'you', time: 'Mon, 15:40',
    diffs: [{ t: 'add', l: '+1 table' }] },
];

export const diagrams: DemoDiagram[] = [
  { id: 'd1', name: 'Core Product DB', db: 'PostgreSQL', tables: 6, edited: '2m ago', live: ['maya', 'kenji', 'aisha'], colors: [C.indigo, C.teal, C.amber, C.green] },
  { id: 'd2', name: 'Analytics Warehouse', db: 'BigQuery', tables: 14, edited: 'Yesterday', live: [], colors: [C.sky, C.violet, C.teal] },
  { id: 'd3', name: 'Auth & Permissions', db: 'PostgreSQL', tables: 5, edited: '3 days ago', live: ['leo'], colors: [C.rose, C.indigo] },
  { id: 'd4', name: 'Billing v2 (draft)', db: 'MySQL', tables: 8, edited: '1 week ago', live: [], colors: [C.green, C.amber, C.sky] },
  { id: 'd5', name: 'Events & Telemetry', db: 'ClickHouse', tables: 11, edited: '2 weeks ago', live: [], colors: [C.violet, C.teal, C.rose] },
];
