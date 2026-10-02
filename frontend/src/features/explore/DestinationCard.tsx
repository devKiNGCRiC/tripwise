/**
 * DestinationCard.tsx — a "postcard" for one destination: photo, name, country,
 * vibe tags, budget stamp and typical daily cost. The whole card links to the
 * destination page.
 */
import { MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Tag } from '@/components/ui/Chip';
import { Stamp } from '@/components/ui/Stamp';
import type { BudgetTier, Destination } from '@/lib/api/types';
import { formatMoney } from '@/lib/utils/format';
import { sizedImage } from '@/lib/utils/images';

/** Budget tier → stamp label + colour. */
const BUDGET_STAMP: Record<BudgetTier, { label: string; tone: 'teal' | 'mustard' | 'violet' }> = {
  budget: { label: '₹ Budget', tone: 'teal' },
  mid: { label: '₹₹ Mid', tone: 'mustard' },
  luxury: { label: '₹₹₹ Luxe', tone: 'violet' },
};

export function DestinationCard({ destination }: { destination: Destination }) {
  const stamp = BUDGET_STAMP[destination.budgetTier];

  return (
    <Link
      to={`/destinations/${destination.slug}`}
      className="group block rounded-card border-2 border-line bg-surface p-3 shadow-pop pop-press focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sky"
    >
      <div className="relative overflow-hidden rounded-xl border-2 border-line">
        <img
          src={sizedImage(destination.image.url, 640)}
          alt={`${destination.name}, ${destination.country}`}
          width={640}
          height={480}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <Stamp tone={stamp.tone} rotate={8} className="absolute top-3 right-3 bg-surface/90">
          {stamp.label}
        </Stamp>
      </div>
      <div className="px-1 pt-3 pb-1">
        <h3 className="text-xl font-extrabold">{destination.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
          <MapPin className="size-3.5" aria-hidden />
          {destination.country}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {destination.vibes.slice(0, 3).map((vibe) => (
            <Tag key={vibe}>{vibe}</Tag>
          ))}
        </div>
        <p className="mt-3 font-mono text-sm">
          from <strong>{formatMoney(destination.avgDailyCost)}</strong>/day
        </p>
      </div>
    </Link>
  );
}
