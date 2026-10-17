/**
 * PlannerPreview.tsx — "Your trip so far", beside the planner: a photo of the destination
 * (as soon as it's a place we know — the living landscape behind turns into its world too)
 * and a summary card that fills in line by line as the traveller answers each step.
 */
import { tripLength, type PlannerValues } from './schema';
import { PACE_LABEL, rangeLabel, TRAVELLER_LABEL } from '@/features/trips/format';
import { useTripWorld } from '@/features/trips/useTripWorld';
import { cn } from '@/lib/utils/cn';
import { formatMoney } from '@/lib/utils/format';
import { sizedImage } from '@/lib/utils/images';
import { useWorld } from '@/world/WorldProvider';

/** The live preview of the trip being planned. */
export function PlannerPreview({ values, step }: { values: PlannerValues; step: number }) {
  const place = useTripWorld(values.destination);
  const { region } = useWorld();
  const days = values.startDate && values.endDate ? tripLength(values.startDate, values.endDate) : 0;
  const datesOk = days >= 1 && days <= 14;
  // Each line appears once its step has been reached (so nothing shows a guess).
  const rows: [string, string, boolean][] = [
    ['Where', values.destination.trim(), values.destination.trim().length > 0],
    ['When', datesOk ? `${days} ${days === 1 ? 'day' : 'days'} · ${rangeLabel(values.startDate, values.endDate)}` : '', datesOk],
    ['Who & budget', `${TRAVELLER_LABEL[values.travellers]} · ${formatMoney({ amount: values.budget || 0, currency: 'INR' })} a day`, step >= 2],
    ['Loves', values.interests.join(', '), values.interests.length > 0],
    ['Pace', PACE_LABEL[values.pace], step >= 4],
  ];

  return (
    <aside aria-label="Your trip so far" className="glass-strong overflow-hidden rounded-card lg:sticky lg:top-24">
      <figure className="relative h-56">
        {place ? (
          <img key={place.id} src={sizedImage(place.image.url, 900)} alt={place.name} className="swap absolute inset-0 size-full object-cover" />
        ) : (
          <img src={region.photo.src} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
        )}
        <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent from-40% to-black/55" />
        <figcaption className="absolute inset-x-5 bottom-4 text-white">
          {place?.localName && (
            <span lang="hi" className="block text-xl text-[#e6b765]">
              {place.localName}
            </span>
          )}
          <span className="font-display text-3xl">{place?.name ?? (values.destination.trim() || 'Anywhere you like')}</span>
        </figcaption>
      </figure>
      <div className="p-5">
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">Your trip so far</p>
        <dl className="mt-3 grid gap-2.5">
          {rows.map(([term, value, ready]) => (
            <div key={term} className={cn('flex items-baseline justify-between gap-4 border-b border-dashed border-line pb-2 transition-opacity', !ready && 'opacity-40')}>
              <dt className="text-sm text-soft">{term}</dt>
              <dd className="text-right font-semibold">{ready ? value : '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
