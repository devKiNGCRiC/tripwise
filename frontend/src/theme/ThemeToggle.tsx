/**
 * ThemeToggle.tsx — the round Day ↔ Night button (a moon by day, a sun by night).
 * Switching eases the whole living landscape into night: stars, moon, lit windows, fireflies.
 * The accessible label describes what the button WILL do, not the current state.
 */
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTheme } from './ThemeProvider';

/** The Day ↔ Night button. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to day theme' : 'Switch to night theme'}
      className={cn('grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink transition hover:rotate-12', className)}
    >
      {isDark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
