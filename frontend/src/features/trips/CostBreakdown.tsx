/**
 * CostBreakdown.tsx — the estimated trip cost: the total in large type, then stay, food,
 * transport and activities as labelled bars (share of the total) with their amounts.
 */
import type { Itinerary } from '@/lib/api/types';
import { formatMoney } from '@/lib/utils/format';

/** How each cost part reads. */
const PARTS: [keyof Itinerary['estimatedCost']['breakdown'], string][] = [
  ['stay', 'Stays'],
  ['food', 'Food'],
  ['transport', 'Getting around'],
  ['activities', 'Activities'],
];

/** The trip's estimated cost. */
export function CostBreakdown({ cost }: { cost: Itinerary['estimatedCost'] }) {
  const money = (amount: number) => formatMoney({ amount, currency: cost.currency });
  return (
    <section aria-labelledby="cost-title" className="glass-strong rounded-card p-6">
      <h2 id="cost-title" className="text-xs font-bold tracking-[0.14em] text-soft uppercase">
        Estimated cost
      </h2>
      <p className="mt-2 font-display text-4xl">{money(cost.total)}</p>
      <p className="text-sm text-soft">for the whole group, roughly</p>
      <ul className="mt-5 grid gap-3">
        {PARTS.map(([key, label]) => {
          const amount = cost.breakdown[key];
          return (
            <li key={key}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="font-semibold">{money(amount)}</span>
              </div>
              <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full bg-accent/15">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${cost.total ? (amount / cost.total) * 100 : 0}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
