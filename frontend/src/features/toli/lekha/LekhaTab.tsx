/**
 * LekhaTab.tsx — the Toli's money (Lekha): who owes whom and the fewest payments to settle up,
 * the totals, the expenses everyone shared (and my personal ones, which only I see), and a form
 * to add one. Fair, not just equal: an expense is split only among those who shared it.
 * Expenses and payments written without signal wait on the phone and save by themselves.
 * Refreshes every few seconds while open.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTrip } from '@/features/trips/hooks';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { NewExpense, NewSettlement, Toli } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from '../hooks';
import { newClientId, useOutbox } from '../useOutbox';
import { AddExpense } from './AddExpense';
import { Balances } from './Balances';
import { ExpenseList } from './ExpenseList';
import { Totals } from './Totals';

/** The Lekha tab. */
export function LekhaTab({ toli }: { toli: Toli }) {
  const { w, english } = useWords();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const expenses = useQuery({ queryKey: ['expenses', toli.id], queryFn: () => toliApi.expenses(toli.id), select: (d) => d.expenses, refetchInterval: TOLI_REFRESH_MS });
  const lekha = useQuery({ queryKey: ['lekha', toli.id], queryFn: () => toliApi.lekha(toli.id), select: (d) => d.lekha, refetchInterval: TOLI_REFRESH_MS });
  const trip = useTrip(toli.tripId ?? '');

  /** After any change: the list, the summary, the feed and the Toli (leaving depends on balances). */
  const refresh = () => {
    for (const key of ['expenses', 'lekha', 'activity', 'toli']) void queryClient.invalidateQueries({ queryKey: [key, toli.id] });
  };
  const outbox = useOutbox<NewExpense>('expenses', toli.id, (item) => toliApi.addExpense(toli.id, item), refresh);
  const settlements = useOutbox<NewSettlement>('settlements', toli.id, (item) => toliApi.settle(toli.id, item), refresh);

  return (
    <div className="grid gap-5">
      <section className="glass-strong grid gap-1 rounded-card p-5">
        <h2 className="text-2xl">
          {w.lekha}{' '}
          {!english && (
            <span lang="hi" className="font-hindi text-lg text-[#b8862f]">
              लेखा
            </span>
          )}
        </h2>
        <p className="text-sm text-soft">Fair, not just equal — who paid, who owes, and only those who shared an expense split it.</p>
      </section>

      {settlements.error && (
        <p role="alert" className="text-sm text-danger">
          {settlements.error}
        </p>
      )}
      {lekha.data && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
          <Balances
            summary={lekha.data}
            meId={user?.id}
            pending={settlements.queue}
            onSettle={(p, method) => settlements.add({ clientId: newClientId(), from: p.from.id, to: p.to.id, amount: p.amount, method })}
          />
          <Totals totals={lekha.data.totals} meId={user?.id} />
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
        <section aria-label="Expenses so far" className="glass-strong grid gap-3 rounded-card p-5">
          <h3 className="text-xl">Expenses</h3>
          {expenses.isPending && (
            <p role="status" className="text-soft">
              Loading…
            </p>
          )}
          {expenses.isError && (
            <p role="alert" className="text-danger">
              Couldn’t load the expenses.
            </p>
          )}
          {outbox.error && (
            <p role="alert" className="text-sm text-danger">
              {outbox.error}
            </p>
          )}
          {expenses.data && (
            <ExpenseList
              expenses={expenses.data}
              pending={outbox.queue}
              memberCount={toli.memberCount}
              meId={user?.id}
              onDelete={async (e) => {
                await toliApi.deleteExpense(toli.id, e.id);
                refresh();
              }}
            />
          )}
        </section>
        {user && <AddExpense toli={toli} meId={user.id} days={trip.data?.days.length ?? 0} onAdd={outbox.add} />}
      </div>
    </div>
  );
}
