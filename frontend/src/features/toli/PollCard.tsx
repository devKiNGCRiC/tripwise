/**
 * PollCard.tsx — one poll in the Decide tab: the question, each option with its votes (Tithi
 * date polls take several picks; others one), destination options compared on TripWise's own
 * facts, who hasn't voted yet, and for leaders "Close poll" (a tie asks which option wins).
 * A closed poll shows what was decided.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { Poll, Toli } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { formatMoney, formatSeason } from '@/lib/utils/format';

/** "A", "A and B", "A, B and C". */
function listOf(names: string[]) {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** One poll. */
export function PollCard({ toli, poll }: { toli: Toli; poll: Poll }) {
  const { english } = useWords();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const open = poll.status === 'open';
  const total = Math.max(1, ...Object.values(poll.counts));

  /** Run an action and refresh the polls (and the Toli, whose choices a close changes). */
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      void queryClient.invalidateQueries({ queryKey: ['polls', toli.id] });
      void queryClient.invalidateQueries({ queryKey: ['toli', toli.id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  /** Pick or unpick an option. */
  function toggle(id: string) {
    const next = poll.multi ? (poll.myVotes.includes(id) ? poll.myVotes.filter((v) => v !== id) : [...poll.myVotes, id]) : [id];
    void run(() => toliApi.votePoll(toli.id, poll.id, next));
  }

  // Who hasn't voted: others by name, then "you".
  const others = poll.notVoted.filter((p) => p.id !== user?.id).map((p) => p.name);
  const meToo = poll.notVoted.some((p) => p.id === user?.id);
  const waiting = [...others, ...(meToo ? ['you'] : [])];
  const winner = poll.options.find((o) => o.id === poll.winner);
  const tie = poll.leading.length !== 1;

  return (
    <article aria-label={poll.question} className="glass-strong grid gap-3 rounded-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">{poll.kind === 'tithi' ? (english ? 'Dates' : 'Tithi · dates') : poll.kind === 'destination' ? 'Where to' : poll.kind === 'transport' ? 'Getting there' : 'Poll'}</p>
        {poll.closesAt && open && <span className="text-xs text-soft">Closes {new Date(poll.closesAt).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
      </div>
      <h3 className="text-xl">{poll.question}</h3>
      <div role="group" aria-label="Options" className="grid gap-2">
        {poll.options.map((o) => {
          const count = poll.counts[o.id] ?? 0;
          const best = open && poll.leading.length === 1 && poll.leading[0] === o.id;
          return (
            <label key={o.id} data-option={o.id} className={cn('grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-3 rounded-2xl border border-line p-3', (best || o.id === poll.winner) && 'border-accent bg-accent/8')}>
              <input type={poll.multi ? 'checkbox' : 'radio'} name={`poll-${poll.id}`} checked={poll.myVotes.includes(o.id)} disabled={!open || busy} onChange={() => toggle(o.id)} className="mt-1 size-4 accent-[var(--trip-accent)]" />
              <span className="grid gap-1">
                <span className="font-semibold">{o.label}</span>
                {o.facts && (
                  <span className="text-sm text-soft">
                    Best {formatSeason(o.facts.bestMonths)}
                    {o.facts.avgDailyCost ? ` · ~${formatMoney({ amount: o.facts.avgDailyCost, currency: 'INR' })} a day` : ''} · {o.facts.topPlaces.join(', ')}
                  </span>
                )}
                {o.facts === null && <span className="text-sm text-soft">Not in TripWise’s catalogue yet</span>}
                <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-accent/15">
                  <i className="block h-full rounded-full bg-accent" style={{ width: `${(count / total) * 100}%` }} />
                </span>
              </span>
              <span className="text-sm text-soft">
                {count} {count === 1 ? 'vote' : 'votes'}
                {best && poll.multi ? ' · best overlap' : ''}
              </span>
            </label>
          );
        })}
      </div>
      {open && waiting.length > 0 && <p className="rounded-xl bg-accent-2/10 px-3 py-2 text-sm font-semibold">⏳ {listOf(waiting)} {waiting.length === 1 && !meToo ? 'hasn’t' : 'haven’t'} voted yet</p>}
      {!open && winner && <p className="font-semibold">Decided: {winner.label}</p>}
      {open && toli.me.role !== 'sahyatri' && (
        <div className="flex flex-wrap items-center gap-2">
          {tie && poll.options.length > 0 && Object.values(poll.counts).some(Boolean) && (
            <span className="text-sm text-soft">It’s a tie — pick one to close:</span>
          )}
          {tie && Object.values(poll.counts).some(Boolean) ? (
            poll.leading.map((id) => (
              <Button key={id} size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => toliApi.closePoll(toli.id, poll.id, id))}>
                {poll.options.find((o) => o.id === id)?.label}
              </Button>
            ))
          ) : (
            <Button size="sm" disabled={busy || !Object.values(poll.counts).some(Boolean)} onClick={() => void run(() => toliApi.closePoll(toli.id, poll.id))}>
              Close poll
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
