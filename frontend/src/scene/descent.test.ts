/**
 * descent.test.ts — the shared scroll-progress store and the maths that turn
 * progress into an altitude, a stage name, and photo cross-fade weights.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { altitudeAt, descentProgress, STAGES, stageAt, stageWeight } from './descent';

describe('descentProgress store', () => {
  afterEach(() => descentProgress.set(0));

  it('clamps to 0–1 and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = descentProgress.subscribe(listener);
    descentProgress.set(1.4);
    expect(descentProgress.get()).toBe(1);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    descentProgress.set(0.5);
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('altitude and stages', () => {
  it('counts down from 9,000 m to 0 m', () => {
    expect(altitudeAt(0)).toBe(9000);
    expect(altitudeAt(1)).toBe(0);
    expect(altitudeAt(0.5)).toBeGreaterThan(0);
    expect(altitudeAt(0.5)).toBeLessThan(9000);
  });

  it('names the stage for any progress', () => {
    expect(STAGES.map((s) => s.name)).toEqual(['Sky', 'Glacier', 'Mountains', 'Waterfall', 'River', 'Land']);
    expect(stageAt(0).name).toBe('Sky');
    expect(stageAt(0.6).name).toBe('Waterfall');
    expect(stageAt(1).name).toBe('Land');
  });

  it('cross-fades photos: full at their stage, gone two stages away, weights sum to 1', () => {
    expect(stageWeight(0, 0)).toBeCloseTo(1);
    expect(stageWeight(2, 0)).toBe(0);
    for (const p of [0, 0.13, 0.5, 0.77, 1]) {
      const total = STAGES.reduce((sum, _s, i) => sum + stageWeight(i, p), 0);
      expect(total).toBeCloseTo(1);
    }
  });
});
