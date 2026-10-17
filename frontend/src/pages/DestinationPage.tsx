/**
 * DestinationPage.tsx — route "/destinations/:slug": one place in depth. A large photo with
 * its names, the summary, a 12-month best-time chart, highlights, the typical daily cost,
 * and "Plan a trip here" (pre-fills the planner). India's places show their own world on
 * the living landscape behind the page.
 */
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { WorldStage } from '@/components/layout/WorldStage';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDestination } from '@/features/explore/hooks';
import { cn } from '@/lib/utils/cn';
import { formatMoney, formatSeason } from '@/lib/utils/format';
import { sizedImage } from '@/lib/utils/images';
import { useWorld } from '@/world/WorldProvider';

/** Short and long month names, January first. */
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** How each budget tier reads. */
const BUDGET = { budget: 'Budget-friendly', mid: 'Mid-range', luxury: 'Luxury' } as const;

/** Route "/destinations/:slug". */
export default function DestinationPage() {
  const { slug = '' } = useParams();
  const { data: destination, isPending, isError } = useDestination(slug);
  const { setRegion } = useWorld();

  // Show this place's world behind the page.
  useEffect(() => {
    if (destination?.region) setRegion(destination.region);
  }, [destination, setRegion]);

  if (isPending) {
    return (
      <div role="status" className="page-wrap pt-28 pb-16">
        <span className="sr-only">Loading destination…</span>
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }
  if (isError || !destination) {
    return (
      <WorldStage>
        <title>Destination not found · TripWise</title>
        <GlassPanel className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-[clamp(36px,5vw,56px)]">Destination not found</h1>
          <p className="text-soft">We couldn't find that place. Explore the ones we know well.</p>
          <Link to="/explore" className={buttonClasses()}>
            Explore destinations
          </Link>
        </GlassPanel>
      </WorldStage>
    );
  }

  const best = new Set(destination.bestMonths);
  return (
    <article className="page-wrap pt-28 pb-16">
      <title>{`${destination.name} · TripWise`}</title>
      <Link to="/explore" className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-sm font-semibold backdrop-blur-md hover:text-accent">
        <ArrowLeft aria-hidden className="size-4" /> All destinations
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* The place */}
        <div className="relative min-h-[420px] overflow-hidden rounded-[32px] text-white">
          <img src={sizedImage(destination.image.url, 1400)} alt={destination.name} className="absolute inset-0 size-full object-cover" />
          <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent from-40% to-black/70" />
          <div className="absolute inset-x-7 bottom-7">
            {destination.localName && (
              <p lang="hi" className="text-2xl text-[#e6b765]">
                {destination.localName}
              </p>
            )}
            <h1 className="text-[clamp(48px,6vw,88px)] text-white">{destination.name}</h1>
            <p className="mt-1 text-lg opacity-90">{destination.country}</p>
          </div>
          <a href={destination.image.creditUrl} target="_blank" rel="noreferrer" className="absolute top-4 right-4 rounded-full bg-black/35 px-2.5 py-1 text-xs backdrop-blur-md">
            Photo: {destination.image.credit}
          </a>
        </div>

        {/* The facts */}
        <GlassPanel className="flex flex-col gap-6">
          <p className="text-lg">{destination.summary}</p>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-ink/5 px-4 py-3">
              <dt className="text-xs font-bold tracking-[0.12em] text-soft uppercase">Typical day</dt>
              <dd className="mt-0.5 font-semibold">{formatMoney(destination.avgDailyCost)} per person</dd>
            </div>
            <div className="rounded-2xl bg-ink/5 px-4 py-3">
              <dt className="text-xs font-bold tracking-[0.12em] text-soft uppercase">Budget</dt>
              <dd className="mt-0.5 font-semibold">{BUDGET[destination.budgetTier]}</dd>
            </div>
          </dl>
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-soft uppercase">Best time · {formatSeason(destination.bestMonths)}</p>
            <ol aria-label="Best months" className="mt-3 grid h-24 grid-cols-12 items-end gap-1.5">
              {SHORT.map((month, i) => (
                <li key={month} aria-label={`${LONG[i]}: ${best.has(i + 1) ? 'Best' : 'Off season'}`} className="grid h-full grid-rows-[1fr_auto] items-end justify-items-center gap-1.5">
                  <span aria-hidden className={cn('w-full rounded-t-md rounded-b-sm', best.has(i + 1) ? 'h-full bg-accent' : 'h-1/4 bg-accent/20')} />
                  <span aria-hidden className="text-[11px] font-semibold text-soft">
                    {month}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-soft uppercase">Don't miss</p>
            <ul className="mt-2 grid gap-1.5">
              {destination.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-2.5 font-medium">
                  <span aria-hidden className="size-1.5 rotate-45 bg-accent" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
          <Link to={`/plan?destination=${encodeURIComponent(destination.name)}`} className={buttonClasses({ variant: 'glow', size: 'lg', className: 'mt-auto' })}>
            Plan a trip here <ArrowRight aria-hidden className="size-4" />
          </Link>
        </GlassPanel>
      </div>
    </article>
  );
}
