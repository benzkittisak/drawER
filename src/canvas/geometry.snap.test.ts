import { describe, expect, it } from 'vitest';
import { createField, createTable } from '@core';
import { cameraCenterTable, snapCamera } from './geometry';

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
