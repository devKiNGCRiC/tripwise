/**
 * RegionBar.tsx — the seven worlds as a bar of buttons, each with a tiny real photo of the
 * place in an arch frame, its name, Hindi name and terrain. While the page tours the regions by
 * itself, a progress line fills under the current one; picking any region ends the tour.
 */
import { cn } from '@/lib/utils/cn';
import { REGIONS } from '@/world/regions';
import { TOUR_SECONDS, useWorld } from '@/world/WorldProvider';

/** The bar of seven region buttons with painted thumbnails. */
export function RegionBar({ className }: { className?: string }) {
  const { index, setRegion, touring } = useWorld();

  return (
    <nav aria-label="Regions" className={cn('glass grid grid-flow-col auto-cols-[minmax(190px,1fr)] gap-1.5 overflow-x-auto rounded-[28px] p-2 [scrollbar-width:none]', className)}>
      {REGIONS.map((region, i) => (
        <button
          key={region.key}
          type="button"
          aria-pressed={i === index}
          onClick={() => setRegion(region.key, { fromUser: true })}
          className={cn(
            'relative flex items-center gap-3 overflow-hidden rounded-[20px] p-2 pr-3 text-left transition-colors',
            i === index ? 'bg-ink/8' : 'hover:bg-ink/5',
          )}
        >
          <img src={region.photo.thumb} alt="" width={54} height={64} className="h-[64px] w-[54px] shrink-0 bg-accent/20 object-cover [clip-path:url(#archClip)]" />
          <span className="min-w-0">
            <b className="block truncate text-[14.5px] leading-tight font-semibold">{region.name}</b>
            <small className="block truncate text-[12.5px] text-soft">
              <span lang="hi">{region.hi}</span> · {region.terr}
            </small>
          </span>
          {/* Auto-tour progress (restarts for each region via the key) */}
          {touring && i === index && (
            <i key={index} aria-hidden className="absolute right-3 bottom-1 left-3 h-0.5 origin-left animate-tour rounded bg-accent" style={{ animationDuration: `${TOUR_SECONDS}s` }} />
          )}
        </button>
      ))}
    </nav>
  );
}
