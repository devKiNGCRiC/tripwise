/**
 * ThemeToggle.tsx — the Day ↔ Night switch: a small glass pill with a sun and a moon,
 * and a knob that glides under whichever theme is on.
 * The accessible label describes what the button WILL do, not the current state.
 */
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to day theme' : 'Switch to night theme'}
      className={cn('relative grid h-10 w-[76px] shrink-0 grid-cols-2 items-center rounded-full border border-line p-1 text-ink', className)}
    >
      {/* The knob: slides right for Night */}
      <span
        aria-hidden
        className={cn(
          'absolute top-1 left-1 size-8 rounded-full bg-ink transition-transform duration-500 ease-out-expo',
          isDark && 'translate-x-[34px]',
        )}
      />
      <Sun aria-hidden className={cn('relative mx-auto size-4 transition-colors duration-500', !isDark && 'text-paper')} />
      <Moon aria-hidden className={cn('relative mx-auto size-4 transition-colors duration-500', isDark && 'text-paper')} />
    </button>
  );
}
