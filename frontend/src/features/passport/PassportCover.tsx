/**
 * PassportCover.tsx — the navy passport cover (always navy, in both themes, like the real
 * document). On wide screens it reads left to right like an open passport page:
 *   photo with a gold TripWise seal · name, @username, home city, type and bio · the
 *   buttons and the traveller's four numbers
 * with a passport-style code line along the bottom (decoration only). On phones the three
 * parts stack.
 */
import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { TRAVELLER_TYPE_LABEL } from '@/features/account/labels';
import type { Passport } from '@/lib/api/types';
import { passportCode } from './passportCode';

/** The cover; `actions` are the buttons above the numbers (yours: Edit profile, Friends). */
export function PassportCover({ passport, actions }: { passport: Passport; actions?: ReactNode }) {
  const { cover, stats } = passport;
  const numbers: [string, string][] = [
    [String(stats.trips), 'Trips'],
    [`${stats.worlds}/7`, 'Worlds'],
    [String(stats.daysAway), 'Days away'],
    [String(stats.marks), 'Yatra marks'],
  ];

  return (
    <section aria-label="Passport cover" className="relative isolate overflow-hidden rounded-card bg-[#0f1a40] p-6 text-[#f6efe3] shadow-[0_40px_80px_-40px_rgb(0_0_0/.55)] sm:px-8 sm:py-7">
      {/* Gold-foil gateway arches, like the crest on a real passport (behind the details) */}
      <svg aria-hidden viewBox="0 0 100 120" className="absolute bottom-[-40%] left-[34%] -z-10 w-64 text-[#e6b765] opacity-15" fill="none" stroke="currentColor" strokeWidth="1">
        {[0, 8, 16, 24].map((i) => (
          <path key={i} d={`M${i} 120 V${45 + i * 0.6} C${i} ${25 + i} ${22 + i * 0.3} ${12 + i * 0.4} 50 ${4 + i} C${78 - i * 0.3} ${12 + i * 0.4} ${100 - i} ${25 + i} ${100 - i} ${45 + i * 0.6} V120`} />
        ))}
      </svg>

      <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_minmax(320px,400px)] xl:items-center">
        {/* The photo, like a passport photo with a seal over its corner */}
        <div className="relative shrink-0 self-start">
          {cover.avatarUrl ? (
            <img src={cover.avatarUrl} alt="" className="size-28 rounded-2xl border-4 border-[#f6efe3] object-cover" />
          ) : (
            <span aria-hidden className="relative grid size-28 place-items-center overflow-hidden rounded-2xl border-4 border-[#f6efe3] bg-[#1d2d63] font-display text-5xl text-[#e6b765]">
              {/* Fine guilloché waves, like the security print on a real passport page */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 size-full opacity-25" fill="none" stroke="currentColor" strokeWidth="0.5">
                {Array.from({ length: 9 }, (_, i) => (
                  <path key={i} d={`M-5 ${12 + i * 10} C20 ${2 + i * 10} 30 ${22 + i * 10} 50 ${12 + i * 10} S80 ${2 + i * 10} 105 ${12 + i * 10}`} />
                ))}
              </svg>
              <span className="relative">{cover.name.charAt(0).toUpperCase()}</span>
            </span>
          )}
          <span aria-hidden className="absolute -right-4 -bottom-4 grid size-12 -rotate-12 place-items-center rounded-full border-2 border-[#e6b765] bg-[#0f1a40]/70 font-display text-[9px] leading-tight tracking-wider text-[#e6b765]">
            TRIP
            <br />
            WISE
          </span>
        </div>

        {/* Who they are */}
        <div className="min-w-0">
          <p lang="hi" className="text-[#e6b765]">
            यात्री पासपोर्ट · TripWise passport
          </p>
          <h1 className="font-display text-[clamp(28px,3.2vw,40px)] leading-tight">{cover.name}</h1>
          <p className="text-[#f6efe3]/75">@{cover.username}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {cover.homeCity && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm">
                <MapPin aria-hidden className="size-3.5" />
                <span>{cover.homeCity}</span>
              </span>
            )}
            {cover.travellerType && <span className="rounded-full bg-[#e6b765] px-3 py-1 text-sm font-semibold text-[#0f1a40]">{TRAVELLER_TYPE_LABEL[cover.travellerType]}</span>}
          </div>
          {cover.bio && <p className="mt-3 max-w-[60ch] leading-relaxed text-[#f6efe3]/90">{cover.bio}</p>}
        </div>

        {/* The buttons and their numbers (below the details until the screen is wide) */}
        <div className="grid gap-4 md:col-span-2 xl:col-span-1">
          {actions && <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div>}
          <ul aria-label="Travel stats" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {numbers.map(([value, label]) => (
              <li key={label} className="rounded-xl bg-[#1a2759] px-3 py-2.5 text-center ring-1 ring-white/6">
                <span className="block font-display text-2xl text-white">{value}</span>
                <span className="text-[11px] font-semibold tracking-wide text-[#f6efe3]/70 uppercase">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The machine-readable line every passport has (decoration) */}
      <p aria-hidden className="mt-5 overflow-hidden font-mono text-[11px] tracking-[0.3em] whitespace-nowrap text-[#8fa0c8] sm:text-xs">
        {passportCode(cover.name, cover.username, cover.joined)}
      </p>
    </section>
  );
}
