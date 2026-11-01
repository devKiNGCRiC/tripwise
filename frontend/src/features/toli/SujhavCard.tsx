/**
 * SujhavCard.tsx — one suggestion on the Sahyatra: who suggested what (in words), their note,
 * 👍 / 👎 votes (tap again to take a vote back), and for leaders Approve / Decline. When the
 * plan has changed since it was suggested, approving says so instead of editing the wrong stop.
 * Decided suggestions show what happened.
 */
import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { Sujhav, Toli } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { describeChange } from './describe';

/** Refresh suggestions (and the trip, which an approval changes). */
function useRefresh(toli: Toli) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['sujhavs', toli.id] });
    if (toli.tripId) void queryClient.invalidateQueries({ queryKey: ['trip', toli.tripId] });
  };
}

/** One suggestion card. */
export function SujhavCard({ toli, sujhav }: { toli: Toli; sujhav: Sujhav }) {
  const refresh = useRefresh(toli);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const leads = toli.me.role !== 'sahyatri';
  const open = sujhav.status === 'open';
  const who = sujhav.author?.name ?? 'Someone';

  /** Run an action, then refresh; show its error on the card. */
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article aria-label={`${who} suggests`} className={cn('grid gap-3 rounded-2xl border border-line bg-white/60 p-4 dark:bg-white/5', open && 'border-l-4 border-l-accent-2')}>
      <div className="flex items-center gap-2.5">
        <Avatar name={who} url={sujhav.author?.avatarUrl} className="size-8 text-sm" />
        <p className="text-sm">
          <b>{who}</b> suggests
        </p>
      </div>
      <p className="font-display text-lg">{describeChange(sujhav.change)}</p>
      {sujhav.note && <p className="text-sm text-soft italic">“{sujhav.note}”</p>}
      {open ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            aria-pressed={sujhav.myVote === 1}
            aria-label={`Agree (${sujhav.up})`}
            disabled={busy}
            onClick={() => void run(() => toliApi.voteSujhav(toli.id, sujhav.id, sujhav.myVote === 1 ? 0 : 1))}
            className={cn(sujhav.myVote === 1 && 'bg-accent text-on-accent')}
          >
            <ThumbsUp aria-hidden className="size-4" /> {sujhav.up}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            aria-pressed={sujhav.myVote === -1}
            aria-label={`Disagree (${sujhav.down})`}
            disabled={busy}
            onClick={() => void run(() => toliApi.voteSujhav(toli.id, sujhav.id, sujhav.myVote === -1 ? 0 : -1))}
            className={cn(sujhav.myVote === -1 && 'bg-ink text-on-ink')}
          >
            <ThumbsDown aria-hidden className="size-4" /> {sujhav.down}
          </Button>
          {leads && (
            <>
              <Button size="sm" disabled={busy} onClick={() => void run(() => toliApi.approveSujhav(toli.id, sujhav.id))}>
                Approve
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => toliApi.declineSujhav(toli.id, sujhav.id))}>
                Decline
              </Button>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm">
          <b>{sujhav.status === 'approved' ? 'Approved' : 'Declined'}</b>
          {sujhav.decidedBy && ` by ${sujhav.decidedBy.name}`}
          {sujhav.reason && ` — ${sujhav.reason}`}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
