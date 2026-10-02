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
