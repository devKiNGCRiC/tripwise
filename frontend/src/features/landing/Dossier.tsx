/**
 * Dossier.tsx — the current region at a glance, beside the hero, kept deliberately light:
 * a large real photograph of the region melting into strong glass, the region's name,
 * three quick facts, and a link down to the full region guide (month chart, signature
 * experiences, places) so the first screen never feels crowded.
 */
import { ArrowDown } from 'lucide-react';
import type { Region } from '@/world/regions';
import { RegionPhoto } from './RegionPhoto';

/** Small caps label used in the panel. */
const LABEL = 'text-xs font-bold tracking-[0.16em] text-soft uppercase';

/** The current region's photo and quick facts. */
export function Dossier({ region, index, total }: { region: Region; index: number; total: number }) {
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  return (
    <aside aria-label="Region dossier" className="glass-strong grid gap-4 overflow-hidden rounded-[30px] p-5 sm:p-6">
      {/* The real place, edge to edge across the top; shorter on short screens */}
      <RegionPhoto region={region} className="-mx-5 -mt-5 h-[clamp(150px,30svh,320px)] sm:-mx-6 sm:-mt-6" />

      <div key={region.key} className="swap flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-[clamp(26px,2.2vw,34px)]">
          {region.name}{' '}
          <span lang="hi" className="text-[0.7em] font-normal text-accent">
            {region.hi}
          </span>
        </h2>
        <span className={LABEL}>{counter}</span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {[
          ['Elevation', region.elev],
          ['Terrain', region.terr],
          ['Best time', region.best],
        ].map(([term, value]) => (
          <div key={term} className="rounded-2xl bg-ink/5 px-3 py-2.5">
            <dt className="text-[11.5px] font-bold tracking-[0.12em] text-soft uppercase">{term}</dt>
            <dd className="mt-0.5 text-[14.5px] font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <a href="#region-guide" className="group flex items-center justify-between rounded-2xl border border-line px-4 py-3 font-semibold transition hover:border-accent hover:bg-ink/4">
        When to go &amp; what to do
        <ArrowDown aria-hidden className="size-4 transition-transform group-hover:translate-y-0.5" />
      </a>
    </aside>
  );
}
