/**
 * Balances.tsx — where everyone stands, and how to settle up:
 *   Balances       each Sahyatri: "gets back ₹2,250", "owes ₹930" or "settled"
 *   To settle up   the fewest payments that clear everyone. The payer gets "Pay with UPI" (opens
 *                  their own UPI app with the amount filled in) when the one being paid shared a
 *                  UPI ID; anyone can "Mark settled" (recorded as UPI after Pay with UPI, else cash)
 *   Payments back  every settlement recorded — kept for good
 * TripWise never holds or moves money.
 */
import { useState } from 'react';
import { CheckCheck, IndianRupee } from 'lucide-react';
import { formatRupees } from '@lekha-rules';
import { Button } from '@/components/ui/Button';
import type { LekhaSummary, NewSettlement, PayMethod } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { METHOD_LABEL } from './labels';

/** One payment to settle. */
type Payment = LekhaSummary['settleUp'][number];
/** A payment's identity (who, whom, how much). */
const keyOf = (p: { from: string; to: string; amount: number }) => `${p.from}>${p.to}:${p.amount}`;

/** Balances, settle-up and payments back. */
export function Balances({ summary, meId, pending, onSettle }: { summary: LekhaSummary; meId?: string; pending: NewSettlement[]; onSettle: (p: Payment, method: PayMethod) => void }) {
  // Payments whose Pay-with-UPI link was opened (so "Mark settled" records them as UPI).
  const [viaUpi, setViaUpi] = useState<string[]>([]);
  const waiting = new Set(pending.map(keyOf));
  const payments = summary.settleUp.filter((p) => !waiting.has(keyOf({ from: p.from.id, to: p.to.id, amount: p.amount })));
  const isMe = (id: string) => id === meId;

  /** "Raj Roy gets back ₹2,250" / "You owe ₹930" / "Ananya Das is settled". */
  function standing(name: string, me: boolean, net: number) {
    if (net > 0) return `${name} ${me ? 'get' : 'gets'} back ${formatRupees(net)}`;
    if (net < 0) return `${name} ${me ? 'owe' : 'owes'} ${formatRupees(-net)}`;
    return me ? 'You’re settled' : `${name} is settled`;
  }

  return (
    <section aria-label="Balances and settling up" className="glass-strong grid gap-4 rounded-card p-5">
      <div className="grid gap-2">
        <h3 className="text-xl">Who owes whom</h3>
        <ul aria-label="Balances" className="grid gap-1.5">
          {summary.balances.map((b) => (
            <li key={b.person.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-3 py-2 text-sm dark:bg-white/5">
              <span className={cn(b.net > 0 && 'text-[#2f7d4f] dark:text-[#7fd1a0]', b.net < 0 && 'text-danger')}>{standing(isMe(b.person.id) ? 'You' : b.person.name, isMe(b.person.id), b.net)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2">
        <h3 className="text-xl">To settle up</h3>
        {payments.length === 0 && pending.length === 0 && <p className="text-sm text-soft">Everyone is settled 🙏</p>}
        <ul aria-label="To settle up" className="grid gap-2">
          {payments.map((p) => {
            const key = keyOf({ from: p.from.id, to: p.to.id, amount: p.amount });
            const label = `${isMe(p.from.id) ? 'You pay' : `${p.from.name} pays`} ${isMe(p.to.id) ? 'you' : p.to.name} ${formatRupees(p.amount)}`;
            return (
              <li key={key} aria-label={label} className="grid gap-2 rounded-2xl border border-line bg-white/70 p-3 dark:bg-white/5">
                <p className="font-semibold">{label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.upiLink && isMe(p.from.id) && (
                    <a href={p.upiLink} onClick={() => setViaUpi((now) => [...now, key])} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">
                      <IndianRupee aria-hidden className="size-4" />
                      Pay with UPI
                    </a>
                  )}
                  <Button size="sm" variant="secondary" icon={<CheckCheck aria-hidden className="size-4" />} onClick={() => onSettle(p, viaUpi.includes(key) ? 'upi' : 'cash')}>
                    Mark settled
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        {summary.settleUp.some((p) => !p.upiLink) && <p className="text-xs text-soft">No UPI ID saved for someone? They can add one on the Sahyatris tab.</p>}
      </div>

      {(summary.settlements.length > 0 || pending.length > 0) && (
        <div className="grid gap-2">
          <h3 className="text-xl">Payments back</h3>
          <ul aria-label="Payments back" className="grid gap-1.5 text-sm">
            {pending.map((s) => (
              <li key={s.clientId} className="rounded-2xl border border-dashed border-line px-3 py-2 text-soft">
                ⏳ {formatRupees(s.amount)} — waiting for signal, it will save by itself
              </li>
            ))}
            {summary.settlements.map((s) => (
              <li key={s.id} className="rounded-2xl bg-white/60 px-3 py-2 dark:bg-white/5">
                {isMe(s.from.id) ? 'You' : s.from.name} paid {isMe(s.to.id) ? 'you' : s.to.name} {formatRupees(s.amount)} · {METHOD_LABEL[s.method]} · recorded by {isMe(s.recordedBy.id) ? 'you' : s.recordedBy.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
