/**
 * DiyaRating.tsx — rate a trip by lighting diyas (oil lamps) instead of stars.
 *
 * Editable: a group of five radio buttons ("1 diya" … "5 diyas"); arrow keys move between
 * them, like any radio group. Read-only (no onChange): a small picture labelled "3 of 5 diyas".
 */
import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

/** One diya, lit (warm gold flame) or unlit (grey). */
function Diya({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('transition-transform', lit ? 'text-[#e09b2d] drop-shadow-[0_0_6px_rgb(224_155_45/.55)]' : 'text-ink/20', className)}>
      {/* the flame */}
      <path d="M16 3c3 4 4 7 0 11-4-4-3-7 0-11z" fill="currentColor" opacity={lit ? 1 : 0.6} />
      {/* the clay lamp */}
      <path d="M3 17h26c-1 6-6 10-13 10S4 23 3 17z" fill={lit ? '#b8543a' : 'currentColor'} />
      <path d="M8 17c2 2 5 3 8 3s6-1 8-3" stroke={lit ? '#f1c27d' : 'transparent'} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** The rating control (or display when `onChange` is absent). */
export function DiyaRating({ value, onChange, label, size = 'md' }: { value: number | null; onChange?: (value: number) => void; label: string; size?: 'sm' | 'md' }) {
  const name = useId();
  const iconSize = size === 'sm' ? 'size-5' : 'size-9';

  // Read-only: a picture of the rating.
  if (!onChange) {
    return (
      <span role="img" aria-label={value ? `${value} of 5 diyas` : 'Not rated yet'} className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Diya key={n} lit={!!value && n <= value} className={iconSize} />
        ))}
      </span>
    );
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-soft">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-xl p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${n} ${n === 1 ? 'diya' : 'diyas'}`} />
            <Diya lit={!!value && n <= value} className={cn(iconSize, 'hover:scale-110')} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
