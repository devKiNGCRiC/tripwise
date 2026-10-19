/**
 * Worlds.tsx — "One India. Seven worlds.": an intro card plus one card per region, each a
 * doorway to that world's places. A card shows the region's best season and a few places
 * (ours where we have them, else the region's classic starting points). It opens Explore
 * filtered to that world, or — where we don't list places yet — the planner, ready to
 * plan its first classic stop. Each card blends a real photograph at the top into the
 * region's painted landscape (the same art as the living world).
 */
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { useReveal } from '@/components/signature/useReveal';
import { useDestinations } from '@/features/explore/hooks';
import { REGIONS } from '@/world/regions';
import { useThumbnails } from '@/world/useThumbnails';

/** The "Seven worlds" cards section. */
export function Worlds() {
  const reveal = useReveal<HTMLElement>();
  const thumbs = useThumbnails();
  // Every destination, to count and name the ones in each world.
  const { data: destinations } = useDestinations();

  return (
    <section ref={reveal} id="worlds" aria-labelledby="worlds-title" className="page-wrap scroll-mt-24 pb-[clamp(60px,10vh,120px)]">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="reveal-up glass-strong flex min-h-60 flex-col justify-between gap-4 rounded-[26px] p-6">
          <span className="text-[11px] font-bold tracking-[0.18em] text-soft uppercase">Seven worlds</span>
          <h2 id="worlds-title" className="text-[clamp(30px,3vw,44px)]">
            One India. <em>Seven worlds.</em>
          </h2>
          <p className="text-soft">Divided by landscape, not lines on a map. Pick a world to see its places — or plan one with AI.</p>
        </div>
        {REGIONS.map((region, i) => {
          const ours = destinations?.filter((d) => d.region === region.key) ?? [];
          const names = (ours.length ? ours.map((d) => d.name) : region.places).slice(0, 3);
          const to = ours.length ? `/explore?world=${region.key}` : `/plan?destination=${encodeURIComponent(region.places[0])}`;
          return (
            <Link
              key={region.key}
              to={to}
              className="reveal-up group relative min-h-60 overflow-hidden rounded-[26px] bg-accent/20 text-white"
              style={{ '--delay': `${0.05 * i}s` } as React.CSSProperties}
            >
              {thumbs[i] && <img src={thumbs[i]} alt="" className="absolute inset-0 size-full object-cover" />}
              {/* The real place, melting into the painting below it; it comes forward on hover */}
              <img
                src={region.photo.src}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover opacity-90 transition duration-700 ease-out-expo mask-[linear-gradient(to_bottom,black_35%,transparent_80%)] group-hover:scale-105 group-hover:opacity-100"
              />
              <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent from-25% to-black/70" />
              <span className="relative z-10 flex h-full min-h-60 flex-col justify-end p-5">
                <b className="font-display text-2xl font-semibold">{region.name}</b>
                <span className="text-sm opacity-90">
                  <span lang="hi">{region.hi}</span> · {region.terr}
                </span>
                {/* What's there and when to go */}
                <span className="mt-3 flex items-center justify-between gap-3 border-t border-white/25 pt-2.5 text-[13px]">
                  <span className="min-w-0 truncate opacity-90">{names.join(' · ')}</span>
                  <span className="shrink-0 font-semibold">Best {region.best}</span>
                </span>
              </span>
              {/* Top row: number, and how many places (or that AI can plan it) */}
              <span aria-hidden className="absolute top-3.5 left-4 z-10 text-xs font-bold tracking-[0.14em]">
                {String(i + 1).padStart(2, '0')}
              </span>
              {destinations && (
                <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[13px] font-semibold backdrop-blur-md">
                  {ours.length ? `${ours.length} ${ours.length === 1 ? 'place' : 'places'}` : 'Plan with AI'}
                  <ArrowUpRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
