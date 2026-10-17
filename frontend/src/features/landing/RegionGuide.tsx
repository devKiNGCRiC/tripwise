/**
 * RegionGuide.tsx — the region in depth, just below the hero (the dossier links here):
 * a 12-month "when to go" chart with this month marked, three signature experiences,
 * and the places to start from. Follows the region on screen and re-animates on change.
 */
import { useReveal } from '@/components/signature/useReveal';
import { cn } from '@/lib/utils/cn';
import type { Region } from '@/world/regions';

/** Month names (short for the chart, long for screen readers), January first. */
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** What each month score means. */
const SCORE = ['', 'Not ideal', 'Good', 'Best'];
/** Small caps section label. */
const LABEL = 'text-xs font-bold tracking-[0.16em] text-soft uppercase';

/** The current region's month chart, experiences and places. */
export function RegionGuide({ region }: { region: Region }) {
  const reveal = useReveal<HTMLElement>();
  const thisMonth = new Date().getMonth();

  return (
    <section ref={reveal} id="region-guide" aria-label={`${region.name} guide`} className="page-wrap scroll-mt-24 pt-[clamp(48px,8vh,96px)]">
      <div className="reveal-up glass-strong grid gap-8 rounded-[36px] p-[clamp(22px,3vw,44px)] lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className={LABEL}>When to go</p>
          <h2 key={region.key} className="swap mt-3 text-[clamp(28px,3vw,44px)]">
            {region.name}, <em>month by month.</em>
          </h2>
          <ol aria-label="When to go" className="mt-6 grid h-[150px] grid-cols-12 items-end gap-1.5 sm:gap-2.5">
            {region.months.map((score, m) => (
              <li
                key={SHORT[m]}
                aria-label={`${LONG[m]}: ${SCORE[score]}`}
                aria-current={m === thisMonth ? 'date' : undefined}
                className="grid h-full grid-rows-[1fr_auto] items-end justify-items-center gap-2"
              >
                <span
                  aria-hidden
                  className={cn('w-full rounded-t-lg rounded-b-sm transition-[height,background-color] duration-700 ease-out-expo', score === 3 ? 'bg-accent' : score === 2 ? 'bg-accent/45' : 'bg-accent/18')}
                  style={{ height: `${score * 33}%` }}
                />
                <span className={cn('text-[11px] font-semibold sm:text-xs', m === thisMonth ? 'text-ink underline decoration-accent decoration-2 underline-offset-4' : 'text-soft')}>
                  {SHORT[m]}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-soft">
            <span><i aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-accent" />Best</span>
            <span><i aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-accent/45" />Good</span>
            <span><i aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-accent/18" />Not ideal</span>
          </p>
        </div>

        <div className="grid content-start gap-6">
          <div>
            <p className={LABEL}>Signature experiences</p>
            <ol className="mt-4 grid gap-3">
              {region.sig.map((experience, k) => (
                <li key={experience} className="swap flex items-center gap-3.5 text-[17px] font-medium" style={{ animationDelay: `${k * 0.06}s` }}>
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent">
                    {k + 1}
                  </span>
                  {experience}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className={LABEL}>Start from</p>
            <ul aria-label="Places" className="mt-3 flex flex-wrap gap-2">
              {region.places.map((place) => (
                <li key={place} className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold">
                  {place}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
