/**
 * GoodToGo.tsx — "Good to go in <this month>": up to six places at their best right now
 * (their best months include this one), as the same cinematic cards Explore uses. It
 * changes with the month, so the homepage always has something timely to plan. "See all"
 * opens Explore filtered to this month.
 */
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useReveal } from '@/components/signature/useReveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/features/explore/DestinationCard';
import { useDestinations } from '@/features/explore/hooks';

/** How many places to show. */
const SHOWN = 6;

/** The "Good to go this month" section. */
export function GoodToGo() {
  const reveal = useReveal<HTMLElement>();
  const now = new Date();
  const month = now.getMonth() + 1;
  const monthName = now.toLocaleString('en-GB', { month: 'long' });
  const { data, isPending } = useDestinations({ month });
  const places = data?.slice(0, SHOWN);

  // Nothing at its best this month (or it failed to load): leave the section out.
  if (!isPending && !places?.length) return null;

  return (
    <section ref={reveal} aria-labelledby="good-title" className="page-wrap pb-[clamp(60px,10vh,120px)]">
      <div className="reveal-up glass rounded-[36px] p-[clamp(22px,3.4vw,48px)]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-[11px] font-bold tracking-[0.18em] text-soft uppercase">Right now</span>
            <h2 id="good-title" className="mt-3 text-[clamp(32px,3.6vw,54px)]">
              Good to go <em>in {monthName}</em>
            </h2>
          </div>
          <div className="flex max-w-[42ch] flex-col items-start gap-3">
            <p className="text-soft">Places at their best this month — the weather's right and the season's on.</p>
            <Link to={`/explore?month=${month}`} className="inline-flex items-center gap-1 font-semibold underline decoration-accent decoration-2 underline-offset-4">
              See all for {monthName} <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
        {/* Three on phones (the rest are a tap on "See all" away), six on wider screens */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-sm:[&>*:nth-child(n+4)]:hidden">
          {places
            ? places.map((d) => <DestinationCard key={d.id} destination={d} className="aspect-[4/5] lg:aspect-[5/6]" />)
            : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-card" />)}
        </div>
      </div>
    </section>
  );
}
