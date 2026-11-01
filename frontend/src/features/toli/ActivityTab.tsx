/**
 * ActivityTab.tsx — what happened in the Toli, newest first, as plain sentences: who started
 * it, who joined or left, role changes, the Sahyatra being planned, suggestions and polls.
 */
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli, ToliEvent } from '@/lib/api/types';
import { ROLE_LABEL } from './labels';
import { TOLI_REFRESH_MS } from './hooks';

/** The name of a member by id (or "someone" if they've left). */
function nameOf(toli: Toli, id: unknown) {
  return toli.members.find((m) => m.id === id)?.name ?? 'someone';
}

/** One event as a sentence. */
export function describeEvent(toli: Toli, event: ToliEvent): string {
  const who = event.actor.name;
  const d = event.data;
  switch (event.type) {
    case 'created':
      return `${who} started the Toli`;
    case 'joined':
      return d.addedBy ? `${who} was added by ${nameOf(toli, d.addedBy)}` : `${who} joined`;
    case 'left':
      return `${who} left`;
    case 'removed':
      return `${who} removed ${nameOf(toli, d.userId)}`;
    case 'role':
      return `${who} made ${nameOf(toli, d.userId)} ${ROLE_LABEL[d.role as keyof typeof ROLE_LABEL] ?? d.role}`;
    case 'planned':
      return `${who} planned the Sahyatra: ${String(d.title ?? '')}`;
    case 'suggested':
      return `${who} suggested a change to the Sahyatra`;
    case 'approved':
      return `${who} approved ${nameOf(toli, d.authorId)}’s suggestion`;
    case 'declined':
      return `${who} declined ${nameOf(toli, d.authorId)}’s suggestion`;
    case 'poll-created':
      return `${who} asked: ${String(d.question ?? '')}`;
    case 'poll-closed':
      return `${who} closed “${String(d.question ?? '')}” — decided: ${String(d.winner ?? '')}`;
    default:
      return `${who} did something`;
  }
}

/** The Activity tab. */
export function ActivityTab({ toli }: { toli: Toli }) {
  const activity = useQuery({ queryKey: ['activity', toli.id], queryFn: () => toliApi.activity(toli.id), select: (d) => d.activity, refetchInterval: TOLI_REFRESH_MS });

  return (
    <section aria-label="Toli activity" className="glass-strong grid gap-3 rounded-card p-5">
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
              <span className="min-w-0 flex-1">{describeEvent(toli, e)}</span>
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
