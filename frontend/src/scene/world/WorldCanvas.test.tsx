/**
 * WorldCanvas.test.tsx — the React wrapper around the 3D world: a lost GPU
 * context hands control back to the photos, and a theme switched while the
 * world was still building is applied once it's ready.
 */
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

const fakeWorld = vi.hoisted(() => ({ setProgress: vi.fn(), setNight: vi.fn(), setPointer: vi.fn(), dispose: vi.fn() }));
const gate = vi.hoisted(() => ({ resolve: (() => {}) as (w: unknown) => void }));
vi.mock('./createWorld', () => ({ createWorld: () => new Promise((resolve) => (gate.resolve = resolve)) }));

import WorldCanvas from './WorldCanvas';

/** Exposes the theme toggle to the test. */
let toggle: () => void = () => {};
function Toggler() {
  toggle = useTheme().toggleTheme;
  return null;
}

function renderCanvas(onError = vi.fn()) {
  const utils = render(
    <ThemeProvider>
      <Toggler />
      <WorldCanvas tier="low" motion visible={false} onReady={() => {}} onError={onError} />
    </ThemeProvider>,
  );
  return { ...utils, onError };
}

describe('WorldCanvas', () => {
  it('applies a theme change made while the world was still building', async () => {
    renderCanvas();
    act(() => toggle()); // switch to Night Flight before the world exists
    await act(async () => gate.resolve(fakeWorld));
    expect(fakeWorld.setNight).toHaveBeenLastCalledWith(true);
  });

  it('reports a lost GPU context so the photos can take over', async () => {
    const { container, onError } = renderCanvas();
    await act(async () => gate.resolve(fakeWorld));
    act(() => {
      container.querySelector('canvas')!.dispatchEvent(new Event('webglcontextlost'));
    });
    expect(onError).toHaveBeenCalledOnce();
  });
});
