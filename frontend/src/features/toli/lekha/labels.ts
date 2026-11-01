/**
 * labels.ts (lekha) — how money words read on screen: categories, payment methods, and the
 * "who paid · shared by whom" line of an expense.
 */
import type { Category, PayMethod, ToliPerson } from '@/lib/api/types';

/** Categories, with an emoji. */
export const CATEGORY_LABEL: Record<Category, string> = {
  stay: '🛏️ Stay',
  food: '🍛 Food',
  transport: '🚌 Transport',
  tickets: '🎟️ Tickets',
  shopping: '🛍️ Shopping',
  other: '✨ Other',
};

/** How it was paid. */
export const METHOD_LABEL: Record<PayMethod, string> = { upi: 'UPI', cash: 'Cash' };

/** "a", "a and b", "a, b and c". */
export function listOf(names: string[]) {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** A person's name, or "you". */
export const nameOrYou = (person: ToliPerson, meId?: string) => (person.id === meId ? 'you' : person.name);

/** "You paid · shared by you and Ananya Das" (or "… shared by everyone"). */
export function paidLine(paidBy: ToliPerson, sharers: ToliPerson[], memberCount: number, meId?: string) {
  const payer = paidBy.id === meId ? 'You' : paidBy.name;
  const who = sharers.length === memberCount && memberCount > 2 ? 'everyone' : listOf(sharers.map((p) => nameOrYou(p, meId)));
  return `${payer} paid · shared by ${who}`;
}
