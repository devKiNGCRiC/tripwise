/**
 * Dossier.tsx — the current region at a glance, on strong glass beside the hero:
 * a real photo of the region melting into the panel's top,
 * elevation, terrain and best time; a 12-month "when to go" chart (this month marked);
 * three signature experiences; and the places to start from. Re-animates on region change.
 */
import { cn } from '@/lib/utils/cn';
import type { Region } from '@/world/regions';
import { RegionPhoto } from './RegionPhoto';

/** Month names for the chart's accessible labels, January first. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** What each month score means. */
const SCORE = ['', 'Not ideal', 'Good', 'Best'];
/** Small caps label used for each block. */
const LABEL = 'text-[11px] font-bold tracking-[0.18em] text-soft uppercase';

/** The current region's facts panel. */
export function Dossier({ region, index, total }: { region: Region; index: number; total: number }) {
  const thisMonth = new Date().getMonth();
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  return (
    <aside aria-label="Region dossier" className="glass-strong grid gap-4 overflow-hidden rounded-[28px] p-5 sm:p-6 [@media(max-height:820px)]:gap-3">
      {/* Postcard: edge to edge across the top of the panel; shorter on short screens */}
      <RegionPhoto region={region} className="-mx-5 -mt-5 -mb-2 h-[clamp(80px,15svh,190px)] sm:-mx-6 sm:-mt-6" />
      <div className="flex items-center justify-between">
        <span className={LABEL}>Region dossier</span>
        <span className={LABEL}>{counter}</span>
      </div>
      <div key={region.key} className="swap flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[30px]">{region.name}</h2>
        <span lang="hi" className="text-xl text-accent-2">
          {region.hi}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {[
          ['Elevation', region.elev],
          ['Terrain', region.terr],
          ['Best', region.best],
        ].map(([term, value]) => (
          <div key={term} className="rounded-2xl bg-ink/5 px-3 py-2.5">
            <dt className="text-[10.5px] font-bold tracking-[0.14em] text-soft uppercase">{term}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <span className={LABEL}>When to go</span>
        <ol aria-label="When to go" className="mt-2 grid h-[74px] grid-cols-12 items-end gap-1.5 [@media(max-height:820px)]:h-[62px]">
          {region.months.map((score, m) => (
            <li
              key={MONTHS[m]}
              aria-label={`${MONTHS[m]}: ${SCORE[score]}`}
              aria-current={m === thisMonth ? 'date' : undefined}
              className="grid justify-items-center gap-1"
            >
              <span
                aria-hidden
                className={cn('w-full rounded-t-md rounded-b-sm transition-[height,background-color] duration-700 ease-out-expo', score === 3 ? 'bg-accent' : 'bg-accent/35')}
                style={{ height: `calc(${score} * min(17px, 2.1svh))` }}
              />
              <span aria-hidden className={cn('text-[10px] font-semibold', m === thisMonth ? 'text-ink underline decoration-accent-2 underline-offset-2' : 'text-soft')}>
                {MONTHS[m][0]}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <span className={LABEL}>Signature experiences</span>
        <ol className="mt-2.5 grid gap-2">
          {region.sig.map((experience, k) => (
            <li key={experience} className="swap flex items-center gap-3 text-[14.5px] font-medium" style={{ animationDelay: `${k * 0.06}s` }}>
              <span aria-hidden className="grid size-[26px] shrink-0 place-items-center rounded-full border border-accent text-xs font-semibold text-accent">
                {k + 1}
              </span>
              {experience}
            </li>
          ))}
        </ol>
      </div>

      {/* Places: hidden on short laptop screens so the hero fits above the fold */}
      <ul aria-label="Places" className="flex flex-wrap gap-1.5 [@media(max-height:820px)]:hidden">
        {region.places.map((place) => (
          <li key={place} className="rounded-full border border-line px-3 py-1 text-[12.5px] font-semibold">
            {place}
          </li>
        ))}
      </ul>
    </aside>
  );
}
