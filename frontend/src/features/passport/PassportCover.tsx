/**
 * PassportCover.tsx — the navy passport cover (always navy, in both themes, like the real
 * document): the traveller's photo with a gold TripWise seal over its corner, name and
 * @username, home city, bio, type of traveller, their numbers, and a passport-style code
 * line along the bottom (decoration only).
 */
import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { TRAVELLER_TYPE_LABEL } from '@/features/account/labels';
import type { Passport } from '@/lib/api/types';

/** "Asha Rao" + "asharao" + joined date → "P<IND<RAO<<ASHA<<<<ASHARAO<SINCE<SEP26<<". */
function codeLine(name: string, username: string, joined: string): string {
  const clean = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]+/g, '<');
  const parts = name.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts.at(-1)! : parts[0];
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  const since = new Date(joined).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '');
  return `P<IND<${clean(surname)}<<${clean(given)}<<<<${clean(username)}<SINCE<${clean(since)}`.padEnd(44, '<').slice(0, 44);
}

/** The cover; `actions` are the buttons in its top corner (yours: Edit profile, Friends). */
export function PassportCover({ passport, actions }: { passport: Passport; actions?: ReactNode }) {
  const { cover, stats } = passport;
  const numbers: [string, string][] = [
    [String(stats.trips), 'Trips'],
    [`${stats.worlds}/7`, 'Worlds'],
    [String(stats.daysAway), 'Days away'],
    [String(stats.marks), 'Yatra marks'],
  ];

  return (
    <section aria-label="Passport cover" className="relative isolate overflow-hidden rounded-card bg-[#0f1a40] p-6 text-[#f6efe3] shadow-[0_40px_80px_-40px_rgb(0_0_0/.55)] sm:p-9">
      {/* Gold-foil gateway arches, like the crest on a real passport */}
      <svg aria-hidden viewBox="0 0 100 120" className="absolute -right-12 -bottom-16 -z-10 w-72 text-[#e6b765] opacity-40" fill="none" stroke="currentColor" strokeWidth="1">
        {[0, 8, 16, 24].map((i) => (
          <path key={i} d={`M${i} 120 V${45 + i * 0.6} C${i} ${25 + i} ${22 + i * 0.3} ${12 + i * 0.4} 50 ${4 + i} C${78 - i * 0.3} ${12 + i * 0.4} ${100 - i} ${25 + i} ${100 - i} ${45 + i * 0.6} V120`} />
        ))}
      </svg>

      <div className="flex flex-col gap-7 md:flex-row md:items-start">
        {/* The photo, like a passport photo with a seal over its corner */}
        <div className="relative shrink-0 self-start">
          {cover.avatarUrl ? (
            <img src={cover.avatarUrl} alt="" className="size-32 rounded-2xl border-4 border-[#f6efe3] object-cover sm:size-36" />
          ) : (
            <span aria-hidden className="grid size-32 place-items-center rounded-2xl border-4 border-[#f6efe3] bg-[#1d2d63] font-display text-6xl text-[#e6b765] sm:size-36">
              {cover.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span aria-hidden className="absolute -right-5 -bottom-5 grid size-14 -rotate-12 place-items-center rounded-full border-2 border-[#e6b765] bg-[#0f1a40]/70 font-display text-[9px] leading-tight tracking-wider text-[#e6b765]">
            TRIP
            <br />
            WISE
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p lang="hi" className="text-[#e6b765]">
                यात्री पासपोर्ट · TripWise passport
              </p>
              <h1 className="mt-1 font-display text-[clamp(30px,4vw,48px)] leading-tight">{cover.name}</h1>
              <p className="text-[#f6efe3]/75">@{cover.username}</p>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>

          {/* Where they're from and what kind of traveller they are */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {cover.homeCity && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm">
                <MapPin aria-hidden className="size-3.5" />
                <span>{cover.homeCity}</span>
              </span>
            )}
            {cover.travellerType && <span className="rounded-full bg-[#e6b765] px-3 py-1 text-sm font-semibold text-[#0f1a40]">{TRAVELLER_TYPE_LABEL[cover.travellerType]}</span>}
          </div>
          {cover.bio && <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-[#f6efe3]/90">{cover.bio}</p>}

          {/* Their numbers */}
          <ul aria-label="Travel stats" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {numbers.map(([value, label]) => (
              <li key={label} className="rounded-2xl bg-white/8 px-4 py-3 text-center">
                <span className="block font-display text-3xl text-white">{value}</span>
                <span className="text-xs font-semibold tracking-wide text-[#f6efe3]/70 uppercase">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The machine-readable line every passport has (decoration) */}
      <p aria-hidden className="mt-7 overflow-hidden font-mono text-[11px] tracking-[0.3em] whitespace-nowrap text-[#8fa0c8] sm:text-xs">
        {codeLine(cover.name, cover.username, cover.joined)}
      </p>
    </section>
  );
}
