/**
 * DestinationCard.tsx — a destination "postcard": a photo with a railway
 * station-sign name plate (English + Hindi), a price tag and a vibe tag.
 * The whole card links to the destination page and leans toward the pointer in 3D.
 *
 * `featured` makes a wide landscape card (used for the first card in a grid),
 * so destination grids aren't a row of identical boxes.
 */
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { Destination, Vibe } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { formatMoney } from '@/lib/utils/format';
import { sizedImage } from '@/lib/utils/images';
import { useTilt } from '@/lib/useTilt';

/** Each vibe tag gets a palette colour, so a glance tells you the kind of trip. */
const VIBE_COLOR: Record<Vibe, string> = {
  beach: 'bg-sky',
  mountains: 'bg-green',
  culture: 'bg-yellow',
  // Red tags use the darker `danger` red so white text passes WCAG AA (4.5:1).
  party: 'bg-danger text-white',
  adventure: 'brand-fill',
  spiritual: 'bg-yellow',
  food: 'brand-fill',
  nature: 'bg-green',
  city: 'bg-sky',
  romantic: 'bg-danger text-white',
};

interface DestinationCardProps {
  destination: Destination;
  featured?: boolean;
  className?: string;
}

export function DestinationCard({ destination, featured = false, className }: DestinationCardProps) {
  const tilt = useTilt();
  const vibe = destination.vibes[0];
  const price = formatMoney(destination.avgDailyCost);
  // Screen readers hear the place first ("Goa, India, from ₹3,500 a day, beach"),
  // not the order things happen to sit in the DOM.
  const accessibleName = `${destination.name}, ${destination.country}, from ${price} a day${vibe ? `, ${vibe}` : ''}`;

  return (
    <Link
      to={`/destinations/${destination.slug}`}
      aria-label={accessibleName}
      {...tilt}
      className={cn(
        'group relative block text-black [transform-style:preserve-3d] [transform:perspective(1000px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] transition-transform duration-150 ease-out',
        'rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sky-deep',
        className,
      )}
      style={{ '--mx': '50%', '--my': '50%' } as CSSProperties}
    >
      <div className="relative h-full overflow-hidden rounded-2xl border-[3px] border-line shadow-pop">
        <img
          src={sizedImage(destination.image.url, featured ? 1100 : 700)}
          alt=""
          width={featured ? 1100 : 700}
          height={featured ? 620 : 875}
          loading="lazy"
          decoding="async"
          className={cn(
            'size-full object-cover transition-transform duration-700 group-hover:scale-105',
            featured ? 'aspect-[16/9] lg:aspect-auto' : 'aspect-[4/5]',
          )}
        />
        {/* Light that follows the pointer */}
        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 [background:radial-gradient(circle_at_var(--mx)_var(--my),rgb(255_255_255/.45),transparent_45%)]" />
      </div>

      <span className="absolute top-3.5 left-3.5 rounded-full border-[2.5px] border-black bg-white px-3 py-0.5 text-[15px] font-semibold [transform:translateZ(40px)]">
        from {price}/day
      </span>
      {vibe && (
        <span
          className={cn(
            'absolute top-3.5 right-3.5 rounded-full border-[2.5px] border-black px-3 py-0.5 text-[15px] font-semibold capitalize [transform:translateZ(40px)_rotate(6deg)]',
            VIBE_COLOR[vibe],
          )}
        >
          {vibe}
        </span>
      )}

      {/* Station-sign name plate: always black on yellow, like the real thing */}
      <div className="absolute inset-x-4 bottom-4 rounded-lg border-[3px] border-black bg-yellow px-3 pt-2 pb-1.5 text-center shadow-[4px_4px_0_#000] [transform:translateZ(50px)]">
        <h3
          className={cn(
            'font-black uppercase',
            // Long names ("Kerala Backwaters") get smaller, narrower letters so they fit the plate.
            destination.name.length > 9
              ? 'text-2xl font-stretch-110%'
              : cn('font-stretch-135%', featured ? 'text-4xl sm:text-5xl' : 'text-[32px]'),
          )}
        >
          {destination.name}
        </h3>
        <p lang={destination.localName ? 'hi' : undefined} className="text-xl leading-tight font-extrabold">
          {destination.localName ?? destination.country}
        </p>
      </div>
    </Link>
  );
}
