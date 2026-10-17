/**
 * DestinationCard.tsx — a cinematic destination card: a full-bleed photo, a price
 * tag and a vibe tag on frosted glass, the place name in the editorial serif with its
 * Hindi name in gold above it, and the travel facts that matter when choosing —
 * best season and budget level. The whole card links to the destination page.
 *
 * Add the `wipe` class (index.css) to have it open left-to-right when revealed;
 * the photo then settles from a slight zoom as it opens.
 */
import { Link } from 'react-router';
import type { BudgetTier, Destination } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { formatMoney, formatSeason } from '@/lib/utils/format';
import { sizedImage } from '@/lib/utils/images';

/** Small frosted label sitting on the photo. */
const GLASS_TAG = 'absolute top-4 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-sm font-medium backdrop-blur-md';

/** How each budget tier reads to travellers. */
const BUDGET_LABEL: Record<BudgetTier, string> = { budget: 'Budget', mid: 'Mid-range', luxury: 'Luxury' };

interface DestinationCardProps {
  destination: Destination;
  className?: string;
}

export function DestinationCard({ destination, className }: DestinationCardProps) {
  const vibe = destination.vibes[0];
  const price = formatMoney(destination.avgDailyCost);
  // Screen readers hear the place first ("Goa, India, from ₹3,500 a day, beach"),
  // not the order things happen to sit in the DOM.
  const accessibleName = `${destination.name}, ${destination.country}, from ${price} a day${vibe ? `, ${vibe}` : ''}`;

  return (
    <Link
      to={`/destinations/${destination.slug}`}
      aria-label={accessibleName}
      className={cn('group relative block overflow-hidden rounded-card text-[#f6efe3]', className)}
    >
      <img
        src={sizedImage(destination.image.url, 1000)}
        alt=""
        width={1000}
        height={1100}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full scale-[1.02] object-cover transition-transform duration-[1600ms] ease-out-expo group-hover:scale-[1.07] [.wipe:not(.is-in)_&]:scale-[1.15]"
      />
      {/* Darken the bottom so the caption always reads */}
      <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent from-40% to-[rgb(10_8_6/.8)]" />

      <span className={cn(GLASS_TAG, 'left-4')}>from {price}/day</span>
      {vibe && <span className={cn(GLASS_TAG, 'right-4 capitalize')}>{vibe}</span>}

      <div className="absolute inset-x-6 bottom-6">
        <p lang={destination.localName ? 'hi' : undefined} className="text-xl text-[#e6b765]">
          {destination.localName ?? destination.country}
        </p>
        <h3 className="mt-1 text-[clamp(38px,4vw,58px)] leading-none">{destination.name}</h3>
        <p className="mt-2 line-clamp-2 max-w-[34ch] text-base opacity-90">{destination.summary}</p>
        {/* Travel facts: when to go, and how much it asks of your wallet */}
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/25 pt-3 text-[13px] tracking-[0.12em] uppercase opacity-90">
          <span>
            Best <span className="tracking-normal normal-case">{formatSeason(destination.bestMonths)}</span>
          </span>
          <span aria-hidden className="size-1 rounded-full bg-[#e6b765]" />
          <span>{BUDGET_LABEL[destination.budgetTier]}</span>
        </p>
      </div>
    </Link>
  );
}
