/**
 * StillScenery.test.tsx — other pages get a fixed scenic backdrop (one stage of
 * the journey), decorative only, with a night version in Night Flight.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, ThemeProvider } from '@/theme/ThemeProvider';
import { StillScenery } from './StillScenery';

function renderStill() {
  return render(
    <ThemeProvider>
      <StillScenery stage="Glacier" />
    </ThemeProvider>,
  );
}

describe('StillScenery', () => {
  it('shows the chosen stage as decoration', () => {
    const { container } = renderStill();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')?.getAttribute('src')).toContain('1454496522488'); // the glacier photo
  });

  it('switches to the night photo in Night Flight', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { container } = renderStill();
    expect(container.querySelector('img')?.getAttribute('src')).toContain('1579033461380'); // aurora over the glacier
  });
});
