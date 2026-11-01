/**
 * lekhaRules.ts — the Toli's money maths (Lekha), with no imports so both the API and the
 * website's demo mock use exactly the same rules (the website reaches it as `@lekha-rules`).
 * Money is always whole paise (integers) — no floating point — and everything adds up exactly:
 *   splitExpense   share an expense equally, by amounts or by shares (leftover paise handed out fairly)
 *   balances       each person's net position (positive = gets money back); always sums to 0
 *   settleUp       the fewest payments that clear everyone (greedy: largest debtor pays largest creditor)
 *   totals         the trip total, by category and per person
 *   toPaise / formatRupees   rupees typed as text ↔ paise
 *   isUpiId / upiLink        a UPI ID's shape, and the upi://pay link that opens the payer's UPI app
 */

/** What an expense was for. */
export type Category = 'stay' | 'food' | 'transport' | 'tickets' | 'shopping' | 'other';
/** Every category, in the order screens show them. */
export const CATEGORIES: Category[] = ['stay', 'food', 'transport', 'tickets', 'shopping', 'other'];
/** How it was paid. */
export type PayMethod = 'upi' | 'cash';

/** Who shared an expense, and how. */
export type Split = { kind: 'equal'; among: string[] } | { kind: 'amounts'; amounts: Record<string, number> } | { kind: 'shares'; shares: Record<string, number> };

/** The result of splitting: each person's part in paise, or why it can't be split. */
export type SplitResult = { ok: true; parts: Record<string, number> } | { ok: false; reason: 'empty' | 'mismatch' | 'bad-share' };

/** The most one share may weigh (e.g. 2 for someone who ate double). */
const MAX_SHARE = 100;

/** Split `amount` paise among the sharers. */
export function splitExpense(amount: number, split: Split): SplitResult {
  if (split.kind === 'equal') {
    // Each sharer once, in the order given; the first ones take the leftover paise.
    const among = [...new Set(split.among)];
    if (!among.length) return { ok: false, reason: 'empty' };
    const base = Math.floor(amount / among.length);
    let left = amount - base * among.length;
    const parts: Record<string, number> = {};
    for (const id of among) {
      parts[id] = base + (left > 0 ? 1 : 0);
      if (left > 0) left--;
    }
    return { ok: true, parts };
  }

  if (split.kind === 'amounts') {
    const entries = Object.entries(split.amounts);
    if (!entries.length) return { ok: false, reason: 'empty' };
    if (entries.some(([, v]) => !Number.isInteger(v) || v < 0)) return { ok: false, reason: 'mismatch' };
    if (entries.reduce((s, [, v]) => s + v, 0) !== amount) return { ok: false, reason: 'mismatch' };
    // Nobody with a zero part counts as a sharer.
    return { ok: true, parts: Object.fromEntries(entries.filter(([, v]) => v > 0)) };
  }

  // By shares: each gets amount × share ÷ all shares, rounded down; the leftover paise go to
  // whoever lost most in the rounding (ties to the earlier person).
  const entries = Object.entries(split.shares);
  if (!entries.length) return { ok: false, reason: 'empty' };
  if (entries.some(([, w]) => !Number.isInteger(w) || w < 1 || w > MAX_SHARE)) return { ok: false, reason: 'bad-share' };
  const weight = entries.reduce((s, [, w]) => s + w, 0);
  const rows = entries.map(([id, w], order) => ({ id, order, part: Math.floor((amount * w) / weight), rest: (amount * w) % weight }));
  let left = amount - rows.reduce((s, r) => s + r.part, 0);
  for (const row of [...rows].sort((x, y) => y.rest - x.rest || x.order - y.order)) {
    if (left <= 0) break;
    row.part++;
    left--;
  }
  return { ok: true, parts: Object.fromEntries(rows.map((r) => [r.id, r.part])) };
}

/** Each person's net position: what they paid (and paid back) minus what they shared (and received). */
export function balances(expenses: { paidBy: string; parts: Record<string, number> }[], settlements: { from: string; to: string; amount: number }[]): Record<string, number> {
  const net: Record<string, number> = {};
  const add = (id: string, value: number) => (net[id] = (net[id] ?? 0) + value);
  for (const e of expenses) {
    const paid = Object.values(e.parts).reduce((s, v) => s + v, 0);
    add(e.paidBy, paid);
    for (const [id, part] of Object.entries(e.parts)) add(id, -part);
  }
  // Paying someone back moves the payer up and the one paid down.
  for (const s of settlements) {
    add(s.from, s.amount);
    add(s.to, -s.amount);
  }
  return net;
}

/** The fewest payments (in practice) that bring everyone to 0. */
export function settleUp(net: Record<string, number>): { from: string; to: string; amount: number }[] {
  const owe = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, left: -v }));
  const getBack = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, left: v }));
  // Largest first; ties by id so the answer is always the same.
  const biggest = (list: { id: string; left: number }[]) => list.filter((x) => x.left > 0).sort((a, b) => b.left - a.left || a.id.localeCompare(b.id))[0];
  const payments: { from: string; to: string; amount: number }[] = [];
  for (let debtor = biggest(owe), creditor = biggest(getBack); debtor && creditor; debtor = biggest(owe), creditor = biggest(getBack)) {
    const amount = Math.min(debtor.left, creditor.left);
    payments.push({ from: debtor.id, to: creditor.id, amount });
    debtor.left -= amount;
    creditor.left -= amount;
  }
  return payments;
}

/** The trip total, by category (every category present) and each person's share. */
export function totals(expenses: { amount: number; category: Category; parts: Record<string, number> }[]): { total: number; byCategory: Record<Category, number>; perPerson: Record<string, number> } {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const perPerson: Record<string, number> = {};
  let total = 0;
  for (const e of expenses) {
    total += e.amount;
    byCategory[e.category] += e.amount;
    for (const [id, part] of Object.entries(e.parts)) perPerson[id] = (perPerson[id] ?? 0) + part;
  }
  return { total, byCategory, perPerson };
}

/** Rupees typed as text ("1,200.75") → paise (120075); null when it isn't a plain amount. */
export function toPaise(text: string): number | null {
  const clean = text.trim().replace(/,/g, '');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(clean);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

/** Paise → "₹1,00,000", "₹640", "₹1,200.75" (Indian digit grouping; no ".00"). */
export function formatRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = String(Math.floor(abs / 100));
  const rest = abs % 100;
  // Last three digits, then pairs: 1,00,000.
  const grouped = rupees.length > 3 ? `${rupees.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ',')},${rupees.slice(-3)}` : rupees;
  return `${sign}₹${grouped}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}

/** A UPI ID like "name@bank". */
export function isUpiId(text: string): boolean {
  return /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9]{1,63}$/i.test(text);
}

/** The link that opens the payer's UPI app with the payee, amount and note filled in. */
export function upiLink(p: { upi: string; name: string; amount: number; note: string }): string {
  const rupees = `${Math.floor(p.amount / 100)}.${String(p.amount % 100).padStart(2, '0')}`;
  return `upi://pay?pa=${encodeURIComponent(p.upi)}&pn=${encodeURIComponent(p.name)}&am=${rupees}&cu=INR&tn=${encodeURIComponent(p.note)}`;
}
