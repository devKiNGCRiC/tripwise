/**
 * Worlds.tsx — "One India. Seven worlds.": an intro card plus one card per region,
 * each showing its painted landscape. Choosing one turns the whole page into it and
 * glides back to the top.
 */
import { useReveal } from '@/components/signature/useReveal';
import { REGIONS } from '@/world/regions';
import { useThumbnails } from '@/world/useThumbnails';
import { useWorld } from '@/world/WorldProvider';

export function Worlds() {
  const reveal = useReveal<HTMLElement>();
  const { setRegion } = useWorld();
  const thumbs = useThumbnails();

  return (
    <section ref={reveal} aria-labelledby="worlds-title" className="page-wrap pb-[clamp(60px,10vh,120px)]">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="reveal-up glass-strong flex min-h-[220px] flex-col justify-between gap-4 rounded-[26px] p-6">
          <span className="text-[11px] font-bold tracking-[0.18em] text-soft uppercase">Seven worlds</span>
          <h2 id="worlds-title" className="text-[clamp(30px,3vw,44px)]">
            One India. <em>Seven worlds.</em>
          </h2>
          <p className="text-soft">Divided by landscape, not lines on a map. Tap one and the whole page becomes it.</p>
        </div>
        {REGIONS.map((region, i) => (
          <button
            key={region.key}
            type="button"
            onClick={() => {
              setRegion(region.key, { fromUser: true });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="reveal-up group relative min-h-[220px] overflow-hidden rounded-[26px] bg-accent/20 text-left text-white"
            style={{ '--delay': `${0.05 * i}s` } as React.CSSProperties}
          >
            {thumbs[i] && <img src={thumbs[i]} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105" />}
            <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent from-35% to-black/55" />
            <span className="relative z-10 flex h-full min-h-[220px] flex-col justify-end p-5">
              <b className="font-display text-2xl font-semibold">{region.name}</b>
              <span className="text-sm opacity-90">
                <span lang="hi">{region.hi}</span> · {region.terr}
              </span>
            </span>
            <span aria-hidden className="absolute top-3.5 left-4 z-10 text-xs font-bold tracking-[0.14em]">
              {String(i + 1).padStart(2, '0')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
