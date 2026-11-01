/**
 * RaiseHand.tsx — Anurodh (raising your hand) in announcement mode:
 *   RaiseHandPanel  for Sahyatris who can't write: say what it's about and raise a hand; then
 *                   see "Your hand is raised", or the leaders' private reply
 *   RaisedHands     for leaders: everyone's raised hands, each with Allow 1 message / 30 min /
 *                   1 hour / Whole trip, a private reply, Decline, and turning requests off for
 *                   someone who keeps asking
 */
import { useState, type FormEvent } from 'react';
import { Hand } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { Anurodh, AnurodhAction, Toli } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from './hooks';

/** Field styles. */
const FIELD = 'h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';

/** The raised hands (leaders: everyone's open ones; everyone: their own latest). */
export function useHands(toliId: string) {
  return useQuery({ queryKey: ['hands', toliId], queryFn: () => toliApi.hands(toliId), refetchInterval: TOLI_REFRESH_MS });
}

/** Refresh hands and the Toli (whose "can I post" may have changed). */
function useRefresh(toliId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['hands', toliId] });
    void queryClient.invalidateQueries({ queryKey: ['toli', toliId] });
  };
}

/** For Sahyatris who can't write right now. */
export function RaiseHandPanel({ toli }: { toli: Toli }) {
  const hands = useHands(toli.id);
  const refresh = useRefresh(toli.id);
  const [about, setAbout] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const mine = hands.data?.mine;

  /** Raise my hand. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await toliApi.raiseHand(toli.id, about.trim());
      setAbout('');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t raise your hand.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-line bg-white/80 p-4 dark:bg-white/5">
      <p className="text-sm">
        📣 <b>Announcement mode</b> — only leaders post here. Raise your hand to ask them.
      </p>
      {mine?.status === 'open' && <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold">✋ Your hand is raised: “{mine.about}”. The leaders will see it.</p>}
      {mine?.status === 'answered' && mine.reply && (
        <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm">
          <b>Reply from the leaders</b> (only you see this): {mine.reply}
        </p>
      )}
      {mine?.status === 'declined' && <p className="text-sm text-soft">Your last request was declined.</p>}
      {toli.me.requestsOff ? (
        <p className="text-sm text-soft">Your leaders have turned off requests for you.</p>
      ) : (
        mine?.status !== 'open' && (
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-2 sm:flex sm:items-end">
            <label className="grid flex-1 gap-1">
              <span className="text-sm font-semibold">What’s it about?</span>
              <input value={about} onChange={(e) => setAbout(e.target.value)} maxLength={200} placeholder="Bus 2 timing changed" className={FIELD} />
            </label>
            <Button type="submit" variant="glow" loading={sending} disabled={!about.trim()} icon={<Hand aria-hidden className="size-4" />}>
              Raise hand
            </Button>
          </form>
        )
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** One raised hand, for leaders. */
function HandRequest({ toli, request }: { toli: Toli; request: Anurodh }) {
  const refresh = useRefresh(toli.id);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /** Decide, then refresh. */
  async function decide(action: AnurodhAction, text?: string) {
    setBusy(true);
    setError('');
    try {
      await toliApi.decideHand(toli.id, request.id, action, text);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  /** Stop this person's requests. */
  async function turnOff() {
    setBusy(true);
    try {
      await toliApi.updateMember(toli.id, request.user.id, { requestsOff: true });
      await toliApi.decideHand(toli.id, request.id, 'decline');
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article aria-label={request.user.name} className="grid gap-2 rounded-2xl border border-line bg-white/70 p-3 dark:bg-white/5">
      <p className="text-sm">
        ✋ <b>{request.user.name}</b> · {new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
      </p>
      <p>“{request.about}”</p>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" disabled={busy} onClick={() => void decide('one')}>
          Allow 1 message
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void decide('30m')}>
          30 min
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void decide('1h')}>
          1 hour
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void decide('trip')}>
          Whole trip
        </Button>
      </div>
      {replying ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void decide('reply', reply.trim());
          }}
          className="flex gap-2"
        >
          <label className="flex-1">
            <span className="sr-only">Private reply to {request.user.name}</span>
            <input value={reply} onChange={(e) => setReply(e.target.value)} maxLength={500} placeholder="Only they will see this" className={FIELD} />
          </label>
          <Button type="submit" size="sm" disabled={busy || !reply.trim()}>
            Send reply
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setReplying(true)}>
            Reply privately…
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void decide('decline')}>
            Decline
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void turnOff()} className="text-danger">
            Turn off requests for {request.user.name}
          </Button>
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

/** Leaders: everyone's raised hands. */
export function RaisedHands({ toli }: { toli: Toli }) {
  const hands = useHands(toli.id);
  const requests = hands.data?.requests ?? [];

  // Show the queue once it has loaded (so an empty one really is empty).
  if (!hands.data) return null;
  return (
    <section aria-label="Raised hands" className="glass-strong grid gap-3 rounded-card p-5">
      <h2 className="text-xl">
        Raised hands{' '}
        <span lang="hi" className="font-hindi text-base text-[#b8862f]">
          अनुरोध
        </span>
      </h2>
      {requests.length === 0 && <p className="text-sm text-soft">No raised hands right now.</p>}
      {requests.map((r) => (
        <HandRequest key={r.id} toli={toli} request={r} />
      ))}
      <p className="text-xs text-soft">One open request each · a 10-minute wait after a decline · private replies are seen only by the person who asked.</p>
    </section>
  );
}
