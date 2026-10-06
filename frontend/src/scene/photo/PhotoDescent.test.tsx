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

describe('PhotoDescent', () => {
  afterEach(() => act(() => descentProgress.set(0)));

  it('is decoration only', () => {
    const { container } = renderScene();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the sky at the start and cross-fades as you descend', () => {
    const { container } = renderScene();
    expect(opacities(container).slice(0, 2)).toEqual([1, 0]);
    act(() => descentProgress.set(0.1)); // halfway between Sky (0) and Glacier (0.2)
    const [sky, glacier] = opacities(container);
    expect(sky).toBeCloseTo(0.5);
    expect(glacier).toBeCloseTo(0.5);
  });

  it('only loads photos for the current and next stages', () => {
    const { container } = renderScene();
    expect(container.querySelectorAll('img').length).toBeLessThanOrEqual(4); // day + night for 2 stages at most
    act(() => descentProgress.set(1));
    expect(container.querySelectorAll('[data-stage="5"] img').length).toBeGreaterThan(0);
  });
});
