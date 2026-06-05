import { describe, expect, it } from 'vitest';
import { createField, createRelationship, createTable } from '@core';
import {
  cameraCenterTable,
  LANE_SPACING,
  layoutRelationshipPaths,
  nextRelationshipFocusSide,
  NODE_W,
  orderRelsForPaint,
  snapCamera,
} from './geometry';

describe('snapCamera', () => {
  it('leaves camera unchanged when zoom is not ~100%', () => {
    const cam = { x: 12.3, y: 45.6, z: 0.75 };
    expect(snapCamera(cam, 2)).toBe(cam);
  });

  it('snaps pan to device pixel grid and normalizes z to 1', () => {
    const cam = { x: 60.333, y: 30.666, z: 1.0005 };
    expect(snapCamera(cam, 2)).toEqual({ x: 60.5, y: 30.5, z: 1 });
  });

  it('keeps integer pan at z = 1', () => {
    expect(snapCamera({ x: 60, y: 30, z: 1 }, 1)).toEqual({ x: 60, y: 30, z: 1 });
  });
});

describe('nextRelationshipFocusSide', () => {
  it('starts on from for a new relationship', () => {
    expect(nextRelationshipFocusSide('r1', null)).toEqual({
      side: 'from',
      next: { relId: 'r1', next: 'to' },
    });
  });

  it('alternates to then from on the same relationship', () => {
    const a = nextRelationshipFocusSide('r1', null);
    expect(nextRelationshipFocusSide('r1', a.next)).toEqual({
      side: 'to',
      next: { relId: 'r1', next: 'from' },
    });
    const b = nextRelationshipFocusSide('r1', a.next);
    expect(nextRelationshipFocusSide('r1', b.next)).toEqual({
      side: 'from',
      next: { relId: 'r1', next: 'to' },
    });
  });

  it('resets to from when switching relationships', () => {
    const a = nextRelationshipFocusSide('r1', null);
    const b = nextRelationshipFocusSide('r1', a.next);
    expect(nextRelationshipFocusSide('r2', b.next)).toEqual({
      side: 'from',
      next: { relId: 'r2', next: 'to' },
    });
  });
});

describe('layoutRelationshipPaths', () => {
  const users = createTable('users', 'users', {
    position: { x: 0, y: 0 },
    fields: [
      createField('u1', 'id', 'int4', { primary: true }),
      createField('u2', 'org_id', 'int4'),
      createField('u3', 'email', 'varchar'),
    ],
  });
  const orders = createTable('orders', 'orders', {
    position: { x: 400, y: 0 },
    fields: [
      createField('o1', 'id', 'int4', { primary: true }),
      createField('o2', 'user_id', 'int4'),
      createField('o3', 'user_email', 'varchar'),
    ],
  });
  const byId = { users, orders };

  it('staggers midX for parallel FKs between the same table pair', () => {
    const rels = [
      createRelationship('r-a', { tableId: 'users', fieldId: 'u2' }, { tableId: 'orders', fieldId: 'o2' }),
      createRelationship('r-b', { tableId: 'users', fieldId: 'u3' }, { tableId: 'orders', fieldId: 'o3' }),
      createRelationship('r-c', { tableId: 'users', fieldId: 'u1' }, { tableId: 'orders', fieldId: 'o1' }),
    ];
    const paths = layoutRelationshipPaths(rels, byId);
    const mids = rels.map((r) => paths.get(r.id)?.labelX).filter((x): x is number => x != null);
    expect(mids).toHaveLength(3);
    const sorted = [...mids].sort((a, b) => a - b);
    expect(sorted[1]! - sorted[0]!).toBe(LANE_SPACING);
    expect(sorted[2]! - sorted[1]!).toBe(LANE_SPACING);
  });

  it('staggers self-referential FKs on one table', () => {
    const self = createTable('nodes', 'nodes', {
      position: { x: 100, y: 100 },
      fields: [
        createField('n1', 'id', 'int4'),
        createField('n2', 'parent_id', 'int4'),
        createField('n3', 'manager_id', 'int4'),
      ],
    });
    const rels = [
      createRelationship('s1', { tableId: 'nodes', fieldId: 'n2' }, { tableId: 'nodes', fieldId: 'n1' }),
      createRelationship('s2', { tableId: 'nodes', fieldId: 'n3' }, { tableId: 'nodes', fieldId: 'n1' }),
    ];
    const paths = layoutRelationshipPaths(rels, { nodes: self });
    const g1 = paths.get('s1');
    const g2 = paths.get('s2');
    expect(g1).toBeTruthy();
    expect(g2).toBeTruthy();
    expect(g1!.labelX).not.toBe(g2!.labelX);
    expect(Math.abs(g1!.labelX - g2!.labelX)).toBe(LANE_SPACING);
  });

  it('routes a self-referential FK as a U-loop off the table right edge', () => {
    const emp = createTable('emp', 'employee', {
      position: { x: 100, y: 100 },
      fields: [
        createField('e1', 'id', 'int4', { primary: true }),
        createField('e2', 'manager_id', 'int4'),
      ],
    });
    const rel = createRelationship('s1', { tableId: 'emp', fieldId: 'e2' }, { tableId: 'emp', fieldId: 'e1' });
    const g = layoutRelationshipPaths([rel], { emp })!.get('s1')!;
    const rightEdge = 100 + NODE_W;
    expect(g.sx).toBe(rightEdge); // both anchors on the right edge
    expect(g.tx).toBe(rightEdge);
    expect(g.sy).not.toBe(g.ty); // distinct field rows
    expect(g.labelX).toBeGreaterThan(rightEdge); // loop bulges outside the node
    expect(g.fromHoriz).toBe(1);
    expect(g.toHoriz).toBe(1);
  });

  it('shifts an edge by its manual routeOffsetX', () => {
    const base = createRelationship('r1', { tableId: 'users', fieldId: 'u2' }, { tableId: 'orders', fieldId: 'o1' });
    const shifted = { ...base, routeOffsetX: 40 };
    const baseX = layoutRelationshipPaths([base], byId).get('r1')!.labelX;
    const shiftedX = layoutRelationshipPaths([shifted], byId).get('r1')!.labelX;
    expect(shiftedX - baseX).toBe(40);
  });

  it('returns null when an endpoint table is missing', () => {
    const rel = createRelationship('x', { tableId: 'users', fieldId: 'u1' }, { tableId: 'missing', fieldId: 'o1' });
    expect(layoutRelationshipPaths([rel], byId).get('x')).toBeNull();
  });
});

describe('orderRelsForPaint', () => {
  it('moves active relationships to the end', () => {
    const rels = [
      createRelationship('a', { tableId: 't1', fieldId: 'f1' }, { tableId: 't2', fieldId: 'f2' }),
      createRelationship('b', { tableId: 't1', fieldId: 'f1' }, { tableId: 't2', fieldId: 'f2' }),
      createRelationship('c', { tableId: 't1', fieldId: 'f1' }, { tableId: 't2', fieldId: 'f2' }),
    ];
    const ordered = orderRelsForPaint(rels, 'b', 'c');
    expect(ordered.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('cameraCenterTable', () => {
  it('centers a table in the viewport at the given zoom', () => {
    const t = createTable('t1', 'users', {
      position: { x: 100, y: 200 },
      fields: [createField('f1', 'id', 'int4')],
    });
    const cam = cameraCenterTable(t, 800, 600, 1);
    expect(cam.z).toBe(1);
    // Table center (100+117, 200+~45) → camera pans so center lands in viewport middle
    expect(cam.x).toBe(800 / 2 - (100 + 234 / 2));
    expect(cam.y).toBe(600 / 2 - (200 + (7 + 38 + 33) / 2));
  });
});
