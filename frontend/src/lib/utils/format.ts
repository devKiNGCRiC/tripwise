/**
 * format.ts — display formatting helpers.
 */
import type { Money } from '@/lib/api/types';

/**
 * "₹3,500" style currency. en-IN gives Indian digit grouping (1,25,000);
 * no decimals because trip estimates are rough anyway.
 */
export function formatMoney({ amount, currency }: Money): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/** Short month names, January first. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Best months to visit (1 = January … 12 = December) as travellers read them:
 * [11, 12, 1, 2, 3] → "Nov – Mar" (runs may wrap past December),
 * [3, 4, 5, 6, 10] → "Mar – Jun, Oct". Every month → "All year".
 */
export function formatSeason(months: number[]): string {
  const set = new Set(months);
  if (set.size === 0) return '';
  if (set.size >= 12) return 'All year';
  const prev = (m: number) => (m === 1 ? 12 : m - 1);
  const next = (m: number) => (m === 12 ? 1 : m + 1);
  const runs: string[] = [];
  for (let m = 1; m <= 12; m++) {
    // A run starts at a month whose previous month isn't in the set.
    if (!set.has(m) || set.has(prev(m))) continue;
    let end = m;
    while (set.has(next(end))) end = next(end);
    runs.push(end === m ? MONTHS[m - 1] : `${MONTHS[m - 1]} – ${MONTHS[end - 1]}`);
  }
  return runs.join(', ');
}
