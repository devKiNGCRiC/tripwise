/**
 * ActivityTab.tsx — what happened in the Toli, newest first, as plain sentences: who started
 * it, who joined or left, role changes, the Sahyatra being planned, suggestions, polls, and
 * money (expenses added or deleted, payments back).
 */
import { useQuery } from '@tanstack/react-query';
import { formatRupees } from '@lekha-rules';
import { Avatar } from '@/components/ui/Avatar';
import type { Words } from '@/features/words/words';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli, ToliEvent } from '@/lib/api/types';
import { roleLabel } from './labels';
import { TOLI_REFRESH_MS } from './hooks';

/** The name of a member by id (or "someone" if they've left). */
function nameOf(toli: Toli, id: unknown) {
  return toli.members.find((m) => m.id === id)?.name ?? 'someone';
}

/** One event as a sentence. */
export function describeEvent(toli: Toli, event: ToliEvent, w: Words): string {
  const who = event.actor.name;
  const d = event.data;
  switch (event.type) {
    case 'created':
      return `${who} started the ${w.toli}`;
    case 'joined':
      return d.addedBy ? `${who} was added by ${nameOf(toli, d.addedBy)}` : `${who} joined`;
    case 'left':
      return `${who} left`;
    case 'removed':
      return `${who} removed ${nameOf(toli, d.userId)}`;
    case 'role':
      return `${who} made ${nameOf(toli, d.userId)} ${roleLabel(w, d.role as Parameters<typeof roleLabel>[1])}`;
    case 'planned':
      return `${who} planned the ${w.sahyatra}: ${String(d.title ?? '')}`;
    case 'suggested':
      return `${who} suggested a change to the ${w.sahyatra}`;
    case 'approved':
      return `${who} approved ${nameOf(toli, d.authorId)}’s suggestion`;
    case 'declined':
      return `${who} declined ${nameOf(toli, d.authorId)}’s suggestion`;
    case 'poll-created':
      return `${who} asked: ${String(d.question ?? '')}`;
    case 'expense-added':
      return `${who} added ${String(d.title ?? 'an expense')} (${formatRupees(Number(d.amount ?? 0))})`;
    case 'expense-deleted':
      return `${who} deleted ${String(d.title ?? 'an expense')} (${formatRupees(Number(d.amount ?? 0))})`;
    case 'settled':
      return `${who} recorded ${nameOf(toli, d.from)} paying ${nameOf(toli, d.to)} back ${formatRupees(Number(d.amount ?? 0))}`;
    case 'poll-closed':
      return `${who} closed “${String(d.question ?? '')}” — decided: ${String(d.winner ?? '')}`;
    default:
      return `${who} did something`;
  }
}

/** The Activity tab. */
export function ActivityTab({ toli }: { toli: Toli }) {
  const { w } = useWords();
  const activity = useQuery({ queryKey: ['activity', toli.id], queryFn: () => toliApi.activity(toli.id), select: (d) => d.activity, refetchInterval: TOLI_REFRESH_MS });

  return (
    <section aria-label={`${w.toli} activity`} className="glass-strong grid gap-3 rounded-card p-5">
      <h2 className="text-xl">Activity</h2>
      {activity.isPending && (
        <p role="status" className="text-soft">
          Loading…
        </p>
      )}
      {activity.isError && (
        <p role="alert" className="text-danger">
          Couldn’t load the activity.
        </p>
      )}
      {activity.data && (
        <ol aria-label="Activity" className="grid gap-2">
          {activity.data.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white/60 px-3 py-2 dark:bg-white/5">
              <Avatar name={e.actor.name} url={e.actor.avatarUrl} className="size-8 text-sm" />
              <span className="min-w-0 flex-1">{describeEvent(toli, e, w)}</span>
              <time dateTime={e.at} className="shrink-0 text-xs text-soft">
                {new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
