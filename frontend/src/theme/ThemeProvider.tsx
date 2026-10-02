/**
 * ThemeProvider.tsx — owns the Day (light) / Night Flight (dark) theme.
 *
 * The theme is applied as <html data-theme="…">; every token in tokens.css
 * switches automatically. The choice is remembered in localStorage, falling
 * back to the OS preference. index.html applies the same logic before React
 * loads, so there is no white flash on refresh.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

/** localStorage key — must match the inline script in index.html. */
export const THEME_STORAGE_KEY = 'tw_theme';

/** Browser UI colour (mobile address bar) for each theme — mirrors --trip-paper. */
const THEME_COLOR: Record<Theme, string> = { light: '#FFF8EE', dark: '#0B1026' };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Works out the starting theme: saved choice first, then OS preference.
 * Never throws — localStorage can be blocked in private browsing.
 */
export function readInitialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked: fall through to the OS preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Wrap the app in this so any component can read or change the theme. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  // Whenever the theme changes: update <html>, the browser UI colour, and remember it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the theme still works for this visit, it just won't be remembered.
    }
  }, [theme]);

  // Stable function identity so consumers don't re-render needlessly.
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/** Read the current theme and the functions to change it. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
