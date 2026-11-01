/**
 * Totals.tsx — what the trip has cost so far: the group total, by category (simple bars), each
 * Sahyatri's share, my own trip so far (my share, plus my personal spending — which only I
 * see), and TripWise's estimate for the Sahyatra when there is one.
 */
import { CATEGORIES, formatRupees } from '@lekha-rules';
import type { LekhaSummary } from '@/lib/api/types';
import { CATEGORY_LABEL } from './labels';

/** The totals card. */
export function Totals({ totals, meId }: { totals: LekhaSummary['totals']; meId?: string }) {
  const biggest = Math.max(1, ...Object.values(totals.byCategory));
  const { share, personal } = totals.mine;

  return (
    <section aria-label="Totals" className="glass-strong grid gap-3 rounded-card p-5">
      <h3 className="text-xl">Trip total {formatRupees(totals.total)}</h3>
      {totals.estimate !== null && (
        <p className="text-sm text-soft">
          TripWise estimated {formatRupees(totals.estimate)} for the whole trip
          {totals.total > totals.estimate ? ' — you’re over the estimate' : ''}.
        </p>
      )}
      <p className="rounded-2xl bg-accent/10 px-3 py-2 text-sm font-semibold">
        Your trip so far: {formatRupees(share)} shared
        {personal > 0 && ` + ${formatRupees(personal)} personal (only you see this)`}
      </p>
      {totals.total > 0 && (
        <ul aria-label="By category" className="grid gap-1.5">
          {CATEGORIES.filter((c) => totals.byCategory[c] > 0).map((c) => (
            <li key={c} className="grid gap-0.5 text-sm">
              <span className="flex justify-between">
                <span>{CATEGORY_LABEL[c]}</span>
                <span className="tabular-nums">{formatRupees(totals.byCategory[c])}</span>
              </span>
              <span aria-hidden className="h-1.5 rounded-full bg-accent/70" style={{ width: `${(totals.byCategory[c] / biggest) * 100}%` }} />
            </li>
          ))}
        </ul>
      )}
      {totals.total > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Each person’s share</summary>
          <ul className="mt-2 grid gap-1">
            {totals.perPerson.map((p) => (
              <li key={p.person.id} className="flex justify-between">
                <span>{p.person.id === meId ? 'You' : p.person.name}</span>
                <span className="tabular-nums">{formatRupees(p.share)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
