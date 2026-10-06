/**
 * SceneryFallback.test.tsx — the 3D world must never take the home page down:
 * a failed 3D chunk keeps the photos, and the photos stay until the 3D world has
 * fully faded in (no blank flash).
 */
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Pretend this device is capable, so Scenery tries 3D.
vi.mock('./quality', async (original) => {
  const actual = await original<typeof import('./quality')>();
  return { ...actual, readDeviceInfo: () => ({ webgl2: true, deviceMemory: 8, width: 1440, saveData: false, reducedMotion: false }) };
});
// No real worker in jsdom.
vi.mock('./world/terrainJob', () => ({ startTerrainJob: () => Promise.resolve() }));

// Controls what the (mocked) 3D canvas does on this test run.
const behaviour = vi.hoisted(() => ({ mode: 'crash' as 'crash' | 'ready' }));
vi.mock('./world/WorldCanvas', () => ({
  default: ({ onReady }: { onReady: () => void }) => {
    if (behaviour.mode === 'crash') throw new Error('3D chunk failed to load');
    queueMicrotask(onReady);
    return <canvas data-testid="world" />;
  },
}));

import { Scenery } from './Scenery';

function renderScenery() {
  return render(
    <ThemeProvider>
      <Scenery />
    </ThemeProvider>,
  );
}

describe('Scenery fallbacks', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps the photos when the 3D world crashes', async () => {
    behaviour.mode = 'crash';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container, findByText } = renderScenery();
    await act(async () => {});
    expect(container.querySelector('[data-stage="0"]')).not.toBeNull();
    expect(findByText).toBeDefined();
  });

  it('keeps the photos underneath until the 3D fade-in has finished', async () => {
    behaviour.mode = 'ready';
    vi.useFakeTimers();
    const { container } = renderScenery();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(container.querySelector('[data-testid="world"]')).not.toBeNull();
    expect(container.querySelector('[data-stage="0"]')).not.toBeNull(); // still there mid-fade
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(container.querySelector('[data-stage="0"]')).toBeNull(); // gone once 3D is fully visible
  });
});
