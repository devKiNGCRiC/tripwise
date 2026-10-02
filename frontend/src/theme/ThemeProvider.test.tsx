/**
 * ThemeProvider.test.tsx — verifies theme choice, persistence, toggling,
 * and that blocked localStorage never crashes the app (Review Focus #5).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to the light theme when nothing is saved and the OS is light', () => {
    renderToggle();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: /night flight/i })).toBeInTheDocument();
  });

  it('restores a saved dark theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderToggle();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles and remembers the choice', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /night flight/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: /day theme/i })).toBeInTheDocument();
  });

  it('still works when localStorage throws (private mode)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /night flight/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
