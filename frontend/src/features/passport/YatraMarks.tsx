/**
 * YatraMarks.tsx — badges earned by travelling (never bought): earned ones glow, the rest
 * wait in grey with a line on how to earn them, and the closest one to earn is suggested.
 */
import type { Passport } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { MarkIcon } from './MarkIcon';

/** "2026-09-14" → "14 Sep 2026". */
const nice = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** The Yatra marks panel. */
export function YatraMarks({ passport }: { passport: Passport }) {
  const earned = passport.marks.filter((m) => m.earnedAt);
  const nextUp = passport.marks.find((m) => !m.earnedAt);

  return (
    <section aria-label="Yatra marks" className="glass-strong rounded-card p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl">Yatra marks</h2>
        <p className="text-sm font-semibold text-soft">{earned.length} earned</p>
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {passport.marks.map((mark) => (
          <li
            key={mark.id}
            aria-label={mark.earnedAt ? `${mark.name}, earned ${nice(mark.earnedAt)}` : `${mark.name}, not yet: ${mark.how}`}
            title={mark.earnedAt ? `Earned ${nice(mark.earnedAt)}` : mark.how}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span
              aria-hidden
              className={cn(
                'grid size-14 place-items-center rounded-2xl',
                mark.earnedAt ? 'border border-[#e6c47c] bg-[#fff3d6] text-[#b8543a] shadow-[0_6px_18px_-8px_rgb(224_155_45/.7)]' : 'border border-dashed border-ink/20 text-ink/30',
              )}
            >
              <MarkIcon id={mark.id} className="size-6" />
            </span>
            <span aria-hidden className={cn('text-xs leading-tight font-semibold', !mark.earnedAt && 'text-soft')}>
              {mark.name}
            </span>
          </li>
        ))}
      </ul>
      {nextUp && (
        <p className="mt-5 border-t border-line pt-4 text-sm text-soft">
          Next: <span className="font-semibold text-ink">{nextUp.name}</span> — {nextUp.how.charAt(0).toLowerCase() + nextUp.how.slice(1)}
        </p>
      )}
    </section>
  );
}
