/**
 * quality.test.ts — which scenery each device gets. A table of real-world
 * situations so the rules stay obvious and don't drift.
 */
import { describe, expect, it } from 'vitest';
import { chooseScene, type DeviceInfo } from './quality';

const desktop: DeviceInfo = { webgl2: true, deviceMemory: 8, width: 1440, saveData: false, reducedMotion: false };

describe('chooseScene', () => {
  it.each<[string, Partial<DeviceInfo>, { pack: string; tier?: string }]>([
    ['powerful desktop → full 3D, high detail', {}, { pack: 'world3d', tier: 'high' }],
    ['mid laptop (4 GB) → 3D, low detail', { deviceMemory: 4, width: 1366 }, { pack: 'world3d', tier: 'low' }],
    ['strong phone → 3D, low detail', { deviceMemory: 8, width: 412 }, { pack: 'world3d', tier: 'low' }],
    ['budget phone → photos', { deviceMemory: 3, width: 390 }, { pack: 'photo' }],
    ['no WebGL2 → photos', { webgl2: false }, { pack: 'photo' }],
    ['Data Saver on → photos', { saveData: true }, { pack: 'photo' }],
    ['reduced motion → photos, no motion', { reducedMotion: true }, { pack: 'photo' }],
    ['unknown memory on desktop (Safari/Firefox) → 3D', { deviceMemory: undefined }, { pack: 'world3d' }],
  ])('%s', (_label, patch, expected) => {
    expect(chooseScene({ ...desktop, ...patch })).toMatchObject(expected);
  });

  it('respects the user choosing photos', () => {
    expect(chooseScene({ ...desktop, preference: 'photo' }).pack).toBe('photo');
  });

  it('respects choosing 3D on a weak phone, but never without WebGL2', () => {
    expect(chooseScene({ ...desktop, deviceMemory: 2, width: 390, preference: 'world3d' }).pack).toBe('world3d');
    expect(chooseScene({ ...desktop, webgl2: false, preference: 'world3d' }).pack).toBe('photo');
  });

  it('turns motion off for reduced-motion users', () => {
    expect(chooseScene({ ...desktop, reducedMotion: true }).motion).toBe(false);
    expect(chooseScene(desktop).motion).toBe(true);
  });
});
