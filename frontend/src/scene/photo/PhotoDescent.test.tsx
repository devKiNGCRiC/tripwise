/**
 * PhotoDescent.test.tsx — the photo scenery: decorative, cross-fades between
 * stages as progress changes, and only loads photos it's about to need.
 */
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { descentProgress } from '../descent';
import { PhotoDescent } from './PhotoDescent';

function renderScene() {
  return render(
    <ThemeProvider>
      <PhotoDescent />
    </ThemeProvider>,
  );
}

/** Opacity of each stage layer, in order. */
const opacities = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-stage]')].map((el) => Number(el.style.opacity));

const originalMatchMedia = window.matchMedia;

describe('PhotoDescent', () => {
  afterEach(() => {
    act(() => descentProgress.set(0));
    window.matchMedia = originalMatchMedia;
  });

  it('is decoration only', () => {
    const { container } = renderScene();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the sky at the start and fades the next stage in over it (no mid-way dimming)', () => {
    const { container } = renderScene();
    expect(opacities(container).slice(0, 2)).toEqual([1, 0]);
    act(() => descentProgress.set(0.1)); // halfway between Sky (0) and Glacier (0.2)
    const [sky, glacier, mountains] = opacities(container);
    expect(sky).toBe(1); // stays fully opaque underneath
    expect(glacier).toBeCloseTo(0.5);
    expect(mountains).toBe(0);
  });

  it('downloads only the current theme photo for each stage', () => {
    const { container } = renderScene();
    expect(container.querySelectorAll('[data-stage="0"] img')).toHaveLength(1);
  });

  it('holds still for reduced-motion users (no drifting layers)', () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    const { container } = renderScene();
    act(() => descentProgress.set(0.1));
    expect(container.querySelector<HTMLElement>('[data-stage="1"]')!.style.transform).not.toContain('translateY');
  });

  it('only loads photos for the current and next stages', () => {
    const { container } = renderScene();
    expect(container.querySelectorAll('img').length).toBeLessThanOrEqual(2); // current + next stage only
    act(() => descentProgress.set(1));
    expect(container.querySelectorAll('[data-stage="5"] img').length).toBeGreaterThan(0);
  });
});
