/**
 * Scenery.test.tsx — the scenery picks a safe pack (photos when WebGL2 is
 * missing, as in jsdom), the altitude meter follows progress, and the user's
 * scenery preference is remembered even when storage is blocked.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AltitudeMeter } from './AltitudeMeter';
import { descentProgress } from './descent';
import { readScenePreference, saveScenePreference } from './scenePreference';
import { Scenery } from './Scenery';

afterEach(() => {
  act(() => descentProgress.set(0));
  vi.restoreAllMocks();
});

describe('Scenery', () => {
  it('falls back to the photo scenery when WebGL2 is unavailable', () => {
    const { container } = render(
      <ThemeProvider>
        <Scenery />
      </ThemeProvider>,
    );
    expect(container.querySelector('[data-stage="0"]')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });
});

describe('AltitudeMeter', () => {
  it('counts down as the descent progresses', () => {
    render(<AltitudeMeter />);
    expect(screen.getByText('9,000 m')).toBeInTheDocument();
    expect(screen.getByText('Sky')).toBeInTheDocument();
    act(() => descentProgress.set(1));
    expect(screen.getByText('0 m')).toBeInTheDocument();
    expect(screen.getByText('Land')).toBeInTheDocument();
  });
});

describe('scene preference', () => {
  it('remembers the chosen scenery', () => {
    saveScenePreference('photo');
    expect(readScenePreference()).toBe('photo');
    saveScenePreference(null);
    expect(readScenePreference()).toBeNull();
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveScenePreference('world3d')).not.toThrow();
    expect(readScenePreference()).toBeNull();
  });
});
