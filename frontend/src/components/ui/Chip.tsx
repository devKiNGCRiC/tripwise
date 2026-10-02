/**
 * Chip.tsx — two small pill components:
 *   Chip → a toggle (aria-pressed) used for filters and the interest "stickers".
 *          When selected it turns mustard and tilts, like a sticker slapped on.
 *   Tag  → a static, non-interactive label (e.g. a destination's vibes).
 */
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ChipProps extends ComponentProps<'button'> {
  selected?: boolean;
  icon?: ReactNode;
  /** Called with the NEW selected value when the chip is clicked. */
  onSelectedChange?: (next: boolean) => void;
}

export function Chip({ selected = false, icon, className, children, onClick, onSelectedChange, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(event) => {
        onClick?.(event);
        onSelectedChange?.(!selected);
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-line px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky',
        selected ? '-rotate-2 bg-mustard text-on-accent shadow-pop-sm' : 'bg-surface text-ink hover:-rotate-1',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Static label pill — purely informational, not clickable. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line/30 bg-paper-2 px-2.5 py-0.5 text-xs font-semibold capitalize text-ink',
        className,
      )}
    >
      {children}
    </span>
  );
}
