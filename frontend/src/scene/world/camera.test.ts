/**
 * camera.test.ts — the descent path: starts above the clouds, ends just above
 * the river, and always gives finite positions (no NaN cameras).
 */
import { describe, expect, it } from 'vitest';
import { cameraPose } from './camera';

describe('cameraPose', () => {
  it('starts high above the clouds', () => {
    expect(cameraPose(0).position.y).toBeGreaterThan(2000);
  });

  it('ends close to the ground at the end of the scroll', () => {
    expect(cameraPose(1).position.y).toBeLessThan(60);
  });

  it('keeps descending overall and never returns NaN', () => {
    let previous = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.1) {
      const { position, target } = cameraPose(p);
      [position.x, position.y, position.z, target.x, target.y, target.z].forEach((v) => expect(Number.isFinite(v)).toBe(true));
      // Small lifts are allowed (the final shot rises a little to open up the view), big climbs aren't.
      expect(position.y).toBeLessThanOrEqual(previous + 10);
      previous = position.y;
    }
  });

  it('clamps progress outside 0–1', () => {
    expect(cameraPose(-1).position.y).toBeCloseTo(cameraPose(0).position.y);
    expect(cameraPose(2).position.y).toBeCloseTo(cameraPose(1).position.y);
  });
});
