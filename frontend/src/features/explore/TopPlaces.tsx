/**
 * TopPlaces.tsx — "Top places in <destination>" on a destination page: real places from the
 * catalogue (Wikidata), most famous first, each with its photo (credited; a name card when
 * there's none), what kind of place it is, a line about it and a Wikipedia link. Interest
 * chips narrow the list (only interests some place has are offered); 12 show at first and
 * "Show all" reveals the rest. Destinations without places (abroad, for now) show nothing.
 */
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PlaceCard } from '@/features/trips/PlaceCard';
import type { Interest, Place, PlaceKind } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { sizedImage } from '@/lib/utils/images';
import { useDestinationPlaces } from './hooks';

/** Places shown before "Show all". */
const FIRST = 12;
/** Interests in the order the planner lists them, with their labels. */
const INTERESTS: [Interest, string][] = [
  ['culture', 'Culture'],
  ['history', 'History'],
  ['spiritual', 'Spiritual'],
  ['nature', 'Nature'],
  ['adventure', 'Adventure'],
  ['photography', 'Photography'],
  ['relaxation', 'Relaxation'],
  ['shopping', 'Shopping'],
  ['food', 'Food'],
  ['nightlife', 'Nightlife'],
];
/** What to call each kind of place. */
const KIND: Record<PlaceKind, string> = {
  temple: 'Temple',
  shrine: 'Place of worship',
  ghat: 'Ghat',
  fort: 'Fort',
  palace: 'Palace',
  museum: 'Museum',
  wildlife: 'Wildlife',
  heritage: 'Heritage site',
  beach: 'Beach',
  water: 'Lake & falls',
  garden: 'Garden',
  nature: 'Nature',
  market: 'Market',
  monument: 'Monument',
};

/** "hindu temple in Hampi" → "Hindu temple in Hampi". */
const capital = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** One place card. */
function PlaceItem({ place }: { place: Place }) {
  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-ink/3">
        <div className="relative h-36 overflow-hidden">
          {place.image ? (
            <>
              <img src={sizedImage(place.image.url, 500)} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              <a
                href={place.image.creditUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute right-2 bottom-2 max-w-[90%] truncate rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur-md"
              >
                Photo: {place.image.credit}
              </a>
            </>
          ) : (
            <PlaceCard name={place.name} className="[&>span:last-child]:text-2xl" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="text-xs font-bold tracking-[0.12em] text-soft uppercase">{KIND[place.kind] ?? place.kind}</p>
          <h3 className="font-display text-xl leading-tight">{place.name}</h3>
          {place.description && <p className="text-sm text-soft">{capital(place.description)}</p>}
          {place.wikipedia && (
            <a href={place.wikipedia} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4">
              Wikipedia <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
      </article>
    </li>
  );
}

/** The destination's places section (nothing when it has none). */
export function TopPlaces({ slug, name }: { slug: string; name: string }) {
  const { data: places } = useDestinationPlaces(slug);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!places?.length) return null;

  const offered = INTERESTS.filter(([key]) => places.some((p) => p.interests.includes(key)));
  const matching = interest ? places.filter((p) => p.interests.includes(interest)) : places;
  const shown = showAll ? matching : matching.slice(0, FIRST);
  const title = `Top places in ${name}`;

  return (
    <section aria-label={title} className="glass-strong mt-6 rounded-[32px] p-[clamp(20px,3vw,40px)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-soft uppercase">From our places catalogue</p>
          <h2 className="mt-2 text-[clamp(28px,3vw,44px)]">{title}</h2>
        </div>
        <p className="text-sm text-soft">{places.length} real places, most famous first.</p>
      </div>

      {/* Interest filter */}
      <div role="group" aria-label="Interest" className="mt-5 flex flex-wrap gap-2">
        {[[null, 'All'] as const, ...offered].map(([key, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={interest === key}
            onClick={() => {
              setInterest(key);
              setShowAll(false);
            }}
            className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors', interest === key ? 'border-transparent bg-accent text-on-accent' : 'border-line hover:bg-ink/6')}
          >
            {label}
          </button>
        ))}
      </div>

      <ul aria-label="Places" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((place) => (
          <PlaceItem key={place.id} place={place} />
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {matching.length > FIRST && !showAll ? (
          <button type="button" onClick={() => setShowAll(true)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-ink/6">
            Show all {matching.length} places
          </button>
        ) : (
          <span />
        )}
        <p className="text-xs text-soft">Places from Wikidata · photos from Wikimedia Commons, credited on each. Check opening hours before you go.</p>
      </div>
    </section>
  );
}
