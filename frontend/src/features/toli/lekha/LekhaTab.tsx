/**
 * LekhaTab.tsx — the Toli's money (Lekha): the expenses everyone shared (and my personal ones,
 * which only I see), and a form to add one. Fair, not just equal: an expense is split only
 * among those who shared it. Expenses written without signal wait on the phone and save by
 * themselves. Refreshes every few seconds while open.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTrip } from '@/features/trips/hooks';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { NewExpense, Toli } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from '../hooks';
import { useOutbox } from '../useOutbox';
import { AddExpense } from './AddExpense';
import { ExpenseList } from './ExpenseList';

/** The Lekha tab. */
export function LekhaTab({ toli }: { toli: Toli }) {
  const { w, english } = useWords();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const expenses = useQuery({ queryKey: ['expenses', toli.id], queryFn: () => toliApi.expenses(toli.id), select: (d) => d.expenses, refetchInterval: TOLI_REFRESH_MS });
  const trip = useTrip(toli.tripId ?? '');

  /** After any change: the list, the summary, the feed and the Toli (leaving depends on balances). */
  const refresh = () => {
    for (const key of ['expenses', 'lekha', 'activity', 'toli']) void queryClient.invalidateQueries({ queryKey: [key, toli.id] });
  };
  const outbox = useOutbox<NewExpense>('expenses', toli.id, (item) => toliApi.addExpense(toli.id, item), refresh);

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
