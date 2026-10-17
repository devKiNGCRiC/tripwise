/**
 * Hero.tsx — the first screen. Over the living landscape: the region counter and names,
 * the region's headline and lede (they rise in afresh on every region change), the
 * planning bar, "who's travelling" chips, the region dossier on the right, and the
 * region bar along the bottom. A soft scrim keeps the words readable over any scene.
 * Type is sized by both width and height so 1280×720 laptops fit it all.
 */
import { cn } from '@/lib/utils/cn';
import { REGIONS } from '@/world/regions';
import { useWorld } from '@/world/WorldProvider';
import { Dossier } from './Dossier';
import { KINDS } from './kinds';
import { Planner } from './Planner';
import { RegionBar } from './RegionBar';

interface HeroProps {
  who: string;
  onWhoChange: (who: string) => void;
}

export function Hero({ who, onWhoChange }: HeroProps) {
  const { region, index } = useWorld();
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(REGIONS.length).padStart(2, '0')}`;

  return (
    <section className="relative isolate">
      {/* Readability wash: from the left on desktop, from the top on phones */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-[var(--trip-scrim)] via-[var(--trip-scrim)] to-transparent lg:bg-linear-to-r lg:via-transparent lg:via-55%" />

      <div className="page-wrap grid min-h-svh grid-rows-[1fr_auto] gap-6 pt-24 pb-5">
        <div className="grid items-center gap-[clamp(24px,4vw,64px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div>
            <p className="flex flex-wrap items-center gap-3.5">
              <span className="rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-on-accent">{counter}</span>
              <span className="text-[11px] font-bold tracking-[0.18em] text-soft uppercase">{region.name}</span>
              <span lang="hi" className="text-[22px] text-accent-2">
                {region.hi}
              </span>
            </p>
            <h1 key={region.key} className="mt-4 text-[clamp(42px,min(6vw,10vh),108px)]">
              <span className="swap">
                {region.headline} <em>{region.accent}</em>
              </span>
            </h1>
            <p key={`lede-${region.key}`} className="swap mt-4 mb-6 max-w-[46ch] text-[clamp(16px,1.25vw,18.5px)] text-soft" style={{ animationDelay: '0.08s' }}>
              {region.lede}
            </p>
            <Planner places={region.places} who={who} onWhoChange={onWhoChange} />
            <div role="group" aria-label="Who's travelling" className="mt-3.5 flex flex-wrap gap-2">
              {KINDS.map((kind) => (
                <button
                  key={kind.title}
                  type="button"
                  aria-pressed={who === kind.who}
                  onClick={() => onWhoChange(kind.who)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium backdrop-blur-md transition',
                    who === kind.who ? 'border-transparent bg-ink text-on-ink' : 'border-line bg-glass hover:border-accent',
                  )}
                >
                  {kind.title}
                </button>
              ))}
            </div>
          </div>
          <Dossier region={region} index={index} total={REGIONS.length} />
        </div>
        <RegionBar />
      </div>
    </section>
  );
}
