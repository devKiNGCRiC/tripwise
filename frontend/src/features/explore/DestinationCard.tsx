/**
 * DestinationCard.tsx — a cinematic destination card: a full-bleed photo, a price
 * tag and a vibe tag on frosted glass, the place name in the editorial serif with its
 * Hindi name in gold above it, and the travel facts that matter when choosing —
 * best season and budget level. The whole card links to the destination page. A deep
 * indigo frame shows while the photo loads.
 */
import { Link } from 'react-router';
import type { BudgetTier, Destination } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { formatMoney, formatSeason } from '@/lib/utils/format';
import { imageSrcSet, sizedImage } from '@/lib/utils/images';

/** Small frosted label sitting on the photo. */
const GLASS_TAG = 'absolute top-4 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-sm font-medium backdrop-blur-md';

/** How each budget tier reads to travellers. */
const BUDGET_LABEL: Record<BudgetTier, string> = { budget: 'Budget', mid: 'Mid-range', luxury: 'Luxury' };

interface DestinationCardProps {
  destination: Destination;
  className?: string;
}

/** A cinematic destination card. */
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
      className={cn('group relative block overflow-hidden rounded-card bg-linear-to-b from-[#3a4566] to-[#1e2747] text-[#f6efe3]', className)}
    >
      <img
        src={sizedImage(destination.image.url, 960)}
        // The browser picks the copy the card needs: a card is a quarter to the full width of the screen.
        srcSet={imageSrcSet(destination.image.url, [500, 960])}
        sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        alt=""
        width={1000}
        height={1100}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full scale-[1.02] object-cover transition-transform duration-[1600ms] ease-out-expo group-hover:scale-[1.07]"
      />
      {/* Darken the bottom so the caption always reads */}
      <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent from-30% via-[rgb(10_8_6/.35)] via-55% to-[rgb(10_8_6/.88)]" />

      <span className={cn(GLASS_TAG, 'left-4')}>from {price}/day</span>
      {vibe && <span className={cn(GLASS_TAG, 'right-4 capitalize')}>{vibe}</span>}

      <div className="absolute inset-x-6 bottom-6 [text-shadow:0_2px_12px_rgb(0_0_0/.45)]">
        <p lang={destination.localName ? 'hi' : undefined} className="text-xl text-[#e6b765]">
          {destination.localName ?? destination.country}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[clamp(28px,2.4vw,38px)] leading-[1.05]">{destination.name}</h3>
        <p className="mt-2 line-clamp-2 max-w-[34ch] text-base opacity-90">{destination.summary}</p>
        {/* Travel facts: when to go, and how much it asks of your wallet */}
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/25 pt-3 text-sm opacity-90">
          <span>Best {formatSeason(destination.bestMonths)}</span>
          <span aria-hidden className="size-1 rounded-full bg-[#e6b765]" />
          <span>{BUDGET_LABEL[destination.budgetTier]}</span>
        </p>
      </div>
    </Link>
  );
}
