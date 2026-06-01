import { describe, expect, it } from 'vitest';
import { snapCamera } from './geometry';

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
