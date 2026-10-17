/**
 * RegionBar.tsx — the seven worlds as a bar of buttons, each with its own little painted
 * landscape (arch-framed), name and Hindi name. While the page tours the regions by
 * itself, a progress line fills under the current one; picking any region ends the tour.
 */
import { cn } from '@/lib/utils/cn';
import { REGIONS } from '@/world/regions';
import { useThumbnails } from '@/world/useThumbnails';
import { TOUR_SECONDS, useWorld } from '@/world/WorldProvider';

export function RegionBar({ className }: { className?: string }) {
  const { index, setRegion, touring } = useWorld();
  const thumbs = useThumbnails();

  return (
    <nav aria-label="Regions" className={cn('glass grid grid-flow-col auto-cols-[minmax(150px,1fr)] gap-1.5 overflow-x-auto rounded-[26px] p-2 [scrollbar-width:none]', className)}>
      {REGIONS.map((region, i) => (
        <button
          key={region.key}
          type="button"
          aria-pressed={i === index}
          onClick={() => setRegion(region.key, { fromUser: true })}
          className={cn(
            'relative flex items-center gap-2.5 overflow-hidden rounded-[18px] p-1.5 pr-3 text-left transition-colors',
            i === index ? 'bg-ink/8' : 'hover:bg-ink/5',
          )}
        >
          {thumbs[i] ? (
            <img src={thumbs[i]} alt="" className="h-[50px] w-[42px] shrink-0 object-cover [clip-path:url(#archClip)]" />
          ) : (
            <span aria-hidden className="h-[50px] w-[42px] shrink-0 bg-accent/30 [clip-path:url(#archClip)]" />
          )}
          <span className="min-w-0">
            <b className="block truncate text-[13px] leading-tight font-semibold">{region.name}</b>
            <small lang="hi" className="text-xs text-soft">
              {region.hi}
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
