/**
 * RegionGuide.tsx — "<World>, month by month": the region in depth, just below the hero
 * (the dossier links here). The 12-month chart is the control: it opens on this month,
 * and choosing any month (click, or the arrow keys) shows that month on the right —
 *   the weather    official averages at one station, in plain words
 *   festivals      with their dates (exact while coming up, "on now", or when they usually
 *                  happen), each with "Plan a trip" for those dates
 *   experiences    the signature ones, in season with "Plan", or their best months if not
 *   places         the starting places at their best that month
 * and one "Plan <world> for <month>" button. Under the chart, "Coming up" lists the world's
 * next three dated festivals; each jumps to its month. Facts come from world/regionMonths.ts, with
 * the date they were checked. Follows the region on screen and re-animates on change.
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, CloudSun, MapPin, PartyPopper, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { useReveal } from '@/components/signature/useReveal';
import { cn } from '@/lib/utils/cn';
import { CHECKED, REGION_MONTHS } from '@/world/regionMonths';
import { festivalWhen, LONG_MONTHS, planLink, seasonLabel, SHORT_MONTHS, weatherIn } from '@/world/monthGuide';
import type { Region } from '@/world/regions';

/** What each month score means. */
const SCORE = ['', 'Not ideal', 'Good', 'Best'];
/** Small caps section label. */
const LABEL = 'text-xs font-bold tracking-[0.16em] text-soft uppercase';
/** A sub-heading inside the month panel, with its icon. */
const SUB = 'flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-soft uppercase';
/** A small "plan" link. */
const PLAN_LINK = 'inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1 text-sm font-semibold hover:bg-ink/6';

/** "20 Oct 2026" from "2026-10-20". */
const checkedOn = `${Number(CHECKED.slice(8, 10))} ${SHORT_MONTHS[Number(CHECKED.slice(5, 7)) - 1]} ${CHECKED.slice(0, 4)}`;

/** The current region's month chart and the chosen month in detail. */
export function RegionGuide({ region }: { region: Region }) {
  const reveal = useReveal<HTMLElement>();
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const [month, setMonth] = useState(thisMonth);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const data = REGION_MONTHS[region.key];
  const monthName = LONG_MONTHS[month - 1];
  const score = region.months[month - 1];
  const weather = weatherIn(data.climate, month);
  const festivals = data.festivals.filter((f) => f.months.includes(month));
  const places = region.places.filter((p) => data.places[p]?.includes(month));
  const title = `${region.name} in ${monthName}`;
  // The next few festivals with real dates still ahead (or on now), soonest first.
  const comingUp = data.festivals
    .map((f) => ({ f, when: festivalWhen(f, now) }))
    .filter(({ when }) => when.dated)
    .sort((a, b) => a.f.next!.start.localeCompare(b.f.next!.start))
    .slice(0, 3);

  /** Choose a month and move focus to its bar (keyboard). */
  function choose(m: number, focus = false) {
    setMonth(m);
    if (focus) buttons.current[m - 1]?.focus();
  }
  /** Arrow keys walk the months (wrapping); Home/End jump to January/December. */
  function onKeyDown(event: KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step) choose(((month - 1 + step + 12) % 12) + 1, true);
    else if (event.key === 'Home') choose(1, true);
    else if (event.key === 'End') choose(12, true);
    else return;
    event.preventDefault();
  }

  return (
    <section ref={reveal} id="region-guide" aria-label={`${region.name} guide`} className="page-wrap scroll-mt-24 pt-[clamp(48px,8vh,96px)]">
      <div className="reveal-up glass-strong grid gap-8 rounded-[36px] p-[clamp(22px,3vw,44px)] lg:grid-cols-[1.1fr_1fr]">
        {/* Left: the chart, which picks the month */}
        <div className="flex flex-col">
          <p className={LABEL}>When to go</p>
          <h2 key={region.key} className="swap mt-3 text-[clamp(28px,3vw,44px)]">
            {region.name}, <em>month by month.</em>
          </h2>
          <p className="mt-2 text-soft">Tap a month to see its weather, festivals and what's in season.</p>
          <div role="group" aria-label="Months" onKeyDown={onKeyDown} className="mt-6 grid h-42.5 grid-cols-12 items-end gap-1.5 sm:gap-2.5">
            {region.months.map((s, i) => {
              const m = i + 1;
              const on = m === month;
              return (
                <button
                  key={SHORT_MONTHS[i]}
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  type="button"
                  aria-label={`${LONG_MONTHS[i]}: ${SCORE[s]}`}
                  aria-pressed={on}
                  aria-current={m === thisMonth ? 'date' : undefined}
                  tabIndex={on ? 0 : -1}
                  onClick={() => choose(m)}
                  className="group grid h-full grid-rows-[1fr_auto] items-end justify-items-center gap-2 rounded-lg outline-offset-4"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'w-full rounded-t-lg rounded-b-sm transition-[height,background-color,transform] duration-500 ease-out-expo group-hover:-translate-y-1',
                      s === 3 ? 'bg-accent' : s === 2 ? 'bg-accent/45' : 'bg-accent/18',
                      on && 'ring-2 ring-ink ring-offset-2 ring-offset-transparent',
                    )}
                    style={{ height: `${s * 33}%` }}
                  />
                  <span
                    className={cn(
                      'text-[11px] font-semibold sm:text-xs',
                      on ? 'text-ink' : 'text-soft',
                      m === thisMonth && 'underline decoration-accent decoration-2 underline-offset-4',
                    )}
                  >
                    {SHORT_MONTHS[i]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-soft">
            <span><i aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-accent" />Best</span>
            <span><i aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-accent/45" />Good</span>
            <span><i aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-accent/18" />Not ideal</span>
            <span className="underline decoration-accent decoration-2 underline-offset-4">This month</span>
          </p>
          {comingUp.length > 0 && (
            <div className="mt-7">
              <p className={LABEL}>Coming up</p>
              <ul aria-label="Coming up" className="mt-3 grid gap-2">
                {comingUp.map(({ f, when }) => (
                  <li key={f.name}>
                    <button
                      type="button"
                      onClick={() => choose(Number(f.next!.start.slice(5, 7)))}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line px-3.5 py-2.5 text-left transition hover:bg-ink/5"
                    >
                      <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-accent/15 py-1 text-xs font-bold uppercase">
                        {SHORT_MONTHS[Number(f.next!.start.slice(5, 7)) - 1]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{f.name}</span>
                        <span className="block text-sm text-soft">
                          {when.label}
                          {when.onNow ? ' · on now' : when.expected ? ' · expected' : ''}
                        </span>
                      </span>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-soft" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-auto pt-6 text-xs text-soft">
            Weather: long-term averages at {data.climate.station} ({data.climate.source}). Festival dates checked {checkedOn}; “expected” dates
            aren't officially confirmed yet — check before you book.
          </p>
        </div>

        {/* Right: the chosen month */}
        <section aria-label={title} key={`${region.key}-${month}`} className="swap grid content-start gap-5 rounded-3xl bg-ink/4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-[clamp(24px,2.2vw,32px)]">{title}</h3>
            <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', score === 3 ? 'bg-accent text-on-accent' : score === 2 ? 'bg-accent/20' : 'bg-ink/8 text-soft')}>
              {score === 3 ? 'Best time' : SCORE[score]}
            </span>
          </div>

          {/* Weather */}
          <div className="flex items-start gap-3">
            <CloudSun aria-hidden className="mt-0.5 size-5 shrink-0 text-soft" />
            <div>
              <p className="text-lg font-semibold">{weather.range}</p>
              <p className="text-soft">{weather.feel}</p>
              <p className="text-xs text-soft">
                {data.climate.station} · {data.climate.source}
              </p>
            </div>
          </div>

          {/* Festivals */}
          <div>
            <p className={SUB}>
              <PartyPopper aria-hidden className="size-4" /> Festivals
            </p>
            {festivals.length ? (
              <ul aria-label="Festivals" className="mt-3 grid gap-3">
                {festivals.map((f) => {
                  const when = festivalWhen(f, now);
                  const to = when.dated && !when.onNow && f.next ? planLink(f.plan, f.next) : planLink(f.plan, { month });
                  return (
                    <li key={f.name} className="rounded-2xl border border-line p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{f.name}</p>
                          <p className="text-sm text-soft">{f.place}</p>
                        </div>
                        <Link to={to} aria-label={`Plan a trip for ${f.name}`} className={PLAN_LINK}>
                          Plan <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <CalendarDays aria-hidden className="size-4 text-soft" />
                        <span className={cn(when.dated && 'font-semibold')}>{when.label}</span>
                        {when.onNow && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">On now</span>}
                        {when.expected && <span className="rounded-full bg-ink/8 px-2 py-0.5 text-xs font-semibold text-soft">Expected</span>}
                      </p>
                      <p className="mt-1 text-sm text-soft">
                        {f.about}{' '}
                        <a href={f.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-ink">
                          Source <ArrowUpRight aria-hidden className="size-3" />
                        </a>
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-soft">No big festivals listed for {monthName}.</p>
            )}
          </div>

          {/* Experiences */}
          <div>
            <p className={SUB}>
              <Sparkles aria-hidden className="size-4" /> Signature experiences
            </p>
            <ul aria-label="Experiences" className="mt-3 grid gap-2">
              {region.sig.map((name) => {
                const exp = data.experiences[name];
                const inSeason = exp?.months.includes(month);
                return (
                  <li key={name} className={cn('flex items-center justify-between gap-3', !inSeason && 'opacity-60')}>
                    <span className="min-w-0">
                      <span className="block font-medium">{name}</span>
                      {exp?.note && <span className="block text-xs text-soft">{exp.note}</span>}
                    </span>
                    {inSeason && exp ? (
                      <Link to={planLink(exp.plan, { month })} aria-label={`Plan ${name}`} className={PLAN_LINK}>
                        Plan <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    ) : (
                      exp && <span className="shrink-0 text-sm text-soft">Best {seasonLabel(exp.months)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Places */}
          <div>
            <p className={SUB}>
              <MapPin aria-hidden className="size-4" /> At their best
            </p>
            {places.length ? (
              <ul aria-label="At their best" className="mt-3 flex flex-wrap gap-2">
                {places.map((place) => (
                  <li key={place}>
                    <Link to={planLink(place, { month })} className="block rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold hover:bg-ink/6">
                      {place}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-soft">An off-season month for these places — the chart shows better ones.</p>
            )}
          </div>

          <Link
            to={planLink(places[0] ?? region.places[0], { month })}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 font-semibold text-on-accent transition hover:brightness-105"
          >
            Plan {region.name} for {monthName} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </section>
      </div>
    </section>
  );
}
