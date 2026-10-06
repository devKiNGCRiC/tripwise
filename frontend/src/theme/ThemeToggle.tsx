/**
 * ThemeToggle.tsx — round sun/moon button that flips Day ↔ Night Flight.
 * The accessible label describes what the button WILL do, not the current state.
 */
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to day theme' : 'Switch to night flight theme'}
      className="grid size-10 place-items-center rounded-full border-2 border-line bg-surface text-ink shadow-pop-sm transition hover:-rotate-12 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
    >
      {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
