/**
 * VisaPages.tsx — the passport's visa pages: an ink stamp for every finished trip (its ink
 * and tilt from its world), a dashed stamp counting down to each upcoming trip, nine to a
 * page. On your own passport a stamp opens that trip's journal, and the newest trip without
 * a memory asks "How was …?".
 */
import { useState } from 'react';
import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import type { Stamp } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { regionByKey } from '@/world/regions';
import { DiyaRating } from './DiyaRating';

/** Stamps per page. */
const PER_PAGE = 9;
/** Tilts cycled so the page looks hand-stamped. */
const TILTS = [-9, 6, -4, 11, -12, 3, 8, -6, 2];

/** "2026-09-14" → "SEP 26". */
const monthYear = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase();

/** The round stamp itself (decorative; the button or link around it carries the label). */
function StampMark({ stamp, tilt }: { stamp: Stamp; tilt: number }) {
  const ink = stamp.region && stamp.region !== 'abroad' ? (regionByKey(stamp.region)?.ui.day[0] ?? '#b8432f') : '#2f6db8';
  const upcoming = stamp.status === 'upcoming';
  return (
    <span
      aria-hidden
      className={cn('grid size-28 place-content-center rounded-full border-4 text-center leading-tight sm:size-32', upcoming ? 'border-dashed border-ink/30 text-soft' : 'border-double mix-blend-multiply dark:mix-blend-normal')}
      style={{ transform: `rotate(${upcoming ? 0 : tilt}deg)`, ...(upcoming ? {} : { borderColor: ink, color: ink }) }}
    >
      {/* Long names get smaller letters so they stay inside the ring */}
      <span className={cn('px-3 font-display tracking-wider uppercase', stamp.destination.length > 10 ? 'text-[11px] leading-tight sm:text-xs' : 'text-sm sm:text-base')}>{stamp.destination}</span>
      {stamp.localName && (
        <span lang="hi" className="text-sm">
          {stamp.localName}
        </span>
      )}
      <span className="mt-0.5 text-[11px] font-bold tracking-widest">{upcoming ? `in ${stamp.daysUntil} d` : monthYear(stamp.startDate)}</span>
    </span>
  );
}

/** The visa pages. `onOpen` (your own passport) opens a trip's journal. */
export function VisaPages({ stamps, mine, onOpen }: { stamps: Stamp[]; mine: boolean; onOpen?: (stamp: Stamp) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(stamps.length / PER_PAGE));
  const shown = stamps.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  // The newest finished trip with no rating or memory yet.
  const unwritten = mine ? stamps.find((s) => s.status === 'completed' && s.journal && s.journal.rating === null && !s.journal.hasMemory) : undefined;

  return (
    <section aria-label="Visa pages" className="glass-strong rounded-card bg-[radial-gradient(circle,var(--trip-line)_1.2px,transparent_1.4px)] bg-size-[20px_20px] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Visa pages</h2>
        {pages > 1 && (
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-full p-1.5 hover:bg-ink/6 disabled:opacity-30">
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <span>
              Page {page + 1} of {pages}
            </span>
            <button type="button" aria-label="Next page" disabled={page === pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-full p-1.5 hover:bg-ink/6 disabled:opacity-30">
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>
        )}
      </div>

      {unwritten && (
        <button type="button" onClick={() => onOpen?.(unwritten)} className={buttonClasses({ variant: 'secondary', className: 'mt-5' })}>
          <PenLine aria-hidden className="size-4" />
          How was {unwritten.destination}?
        </button>
      )}

      {stamps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="font-display text-2xl">No stamps yet</p>
          <p className="max-w-sm text-soft">{mine ? 'Each finished trip leaves a stamp here. Where to first?' : 'No finished trips to show yet.'}</p>
          {mine && (
            <Link to="/plan" className={buttonClasses({ className: 'mt-2' })}>
              Plan a trip
            </Link>
          )}
        </div>
      ) : (
        <ul aria-label="Stamps" className="mt-6 grid grid-cols-2 place-items-center gap-x-4 gap-y-8 sm:grid-cols-3">
          {shown.map((stamp, i) => {
            const tilt = TILTS[(page * PER_PAGE + i) % TILTS.length];
            const rating = stamp.journal?.rating;
            const label = stamp.status === 'upcoming' ? `${stamp.destination}, in ${stamp.daysUntil} days` : `${stamp.destination} journal${rating ? `, ${rating} diyas` : ''}`;
            const under = stamp.status === 'completed' && rating ? <DiyaRating value={rating} label="Rating" size="sm" /> : null;
            return (
              <li key={stamp.id} className="flex flex-col items-center gap-2">
                {stamp.status === 'upcoming' && mine ? (
                  <Link to={`/trips/${stamp.id}`} aria-label={label} className="rounded-full transition hover:scale-105">
                    <StampMark stamp={stamp} tilt={tilt} />
                  </Link>
                ) : mine ? (
                  <button type="button" aria-label={label} onClick={() => onOpen?.(stamp)} className="rounded-full transition hover:scale-105">
                    <StampMark stamp={stamp} tilt={tilt} />
                  </button>
                ) : (
                  <span role="img" aria-label={label}>
                    <StampMark stamp={stamp} tilt={tilt} />
                  </span>
                )}
                {under}
                {!mine && stamp.journal?.coverPhotoUrl && <img src={stamp.journal.coverPhotoUrl} alt={`A photo from ${stamp.destination}`} className="h-16 w-24 rounded-lg border-2 border-white object-cover shadow" />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
