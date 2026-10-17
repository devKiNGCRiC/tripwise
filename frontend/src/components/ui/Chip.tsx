/**
 * Chip.tsx — two small pill components:
 *   Chip → a toggle (aria-pressed) used for filters and quick picks.
 *          Selected chips fill with ink (Day) / gold (Night).
 *   Tag  → a static, non-interactive label (e.g. a destination's vibe).
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
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[15px] font-medium transition duration-300',
        selected ? 'border-transparent bg-cta text-on-cta' : 'border-line text-ink hover:border-gold hover:bg-glass',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Tag colours: quiet hairline, or gold for highlights like "Coming soon". */
const TAG_TONES = {
  default: 'border-line text-ink',
  gold: 'border-gold/60 text-gold',
};

/** Static label pill — purely informational, not clickable. */
export function Tag({ children, tone = 'default', className }: { children: ReactNode; tone?: keyof typeof TAG_TONES; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', TAG_TONES[tone], className)}>
      {children}
    </span>
  );
}
