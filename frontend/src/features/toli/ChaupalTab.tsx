/**
 * ChaupalTab.tsx — the Toli's chat (Chaupal). Messages refresh every few seconds and are marked
 * read while the tab is open (which clears the unread dot on the Tolis link). Sending never
 * loses a message: it is kept on the phone (per Toli) until the server has it, and is resent by
 * itself when the signal comes back — each with its own id, so a retry is stored only once.
 * In announcement mode, Sahyatris who can't write raise a hand instead; leaders see the
 * raised hands above the chat.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { ChaupalMessage, Toli } from '@/lib/api/types';
import { Composer } from './Composer';
import { MessageList, type PendingMessage } from './MessageList';
import { RaiseHandPanel, RaisedHands } from './RaiseHand';

/** How often the chat checks for new messages. */
export const CHAT_REFRESH_MS = 3000;

/** A message waiting on the phone, with its photos. */
type Queued = PendingMessage & { photoIds: string[] };

/** Where my waiting messages for a Toli are kept (per account, so a shared phone never sends them as someone else). */
const queueKey = (userId: string, toliId: string) => `tripwise:toli-outbox:${userId}:${toliId}`;

/** Read the waiting messages (storage may be unavailable). */
function loadQueue(key: string): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as Queued[];
  } catch {
    return [];
  }
}

/** Save the waiting messages. */
function saveQueue(key: string, queue: Queued[]) {
  try {
    if (queue.length) localStorage.setItem(key, JSON.stringify(queue));
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked: the queue still lives in memory for this visit.
  }
}

/** A fresh id for a message made on this phone. */
function newClientId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2)}`;
}

/** The Chaupal tab. */
export function ChaupalTab({ toli }: { toli: Toli }) {
  const { w } = useWords();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messages = useQuery({ queryKey: ['messages', toli.id], queryFn: () => toliApi.messages(toli.id), select: (d) => d.messages, refetchInterval: CHAT_REFRESH_MS });
  const outbox = queueKey(user?.id ?? 'signed-out', toli.id);
  const [queue, setQueue] = useState<Queued[]>(() => loadQueue(outbox));
  const [replyTo, setReplyTo] = useState<ChaupalMessage | null>(null);
  const [error, setError] = useState('');
  const sending = useRef(new Set<string>());
  const leads = toli.me.role !== 'sahyatri';

  /** Change the queue and keep the phone's copy in step. */
  const updateQueue = useCallback(
    (change: (q: Queued[]) => Queued[]) =>
      setQueue((q) => {
        const next = change(q);
        saveQueue(outbox, next);
        return next;
      }),
    [outbox],
  );

  /** Try to send one waiting message; it stays queued only when there's no signal. */
  const trySend = useCallback(
    async (item: Queued) => {
      if (sending.current.has(item.clientId)) return;
      sending.current.add(item.clientId);
      try {
        await toliApi.send(toli.id, { text: item.text, clientId: item.clientId, ...(item.replyTo ? { replyTo: item.replyTo } : {}), ...(item.photoIds.length ? { photoIds: item.photoIds } : {}) });
        updateQueue((q) => q.filter((x) => x.clientId !== item.clientId));
        void queryClient.invalidateQueries({ queryKey: ['messages', toli.id] });
        // A one-message permission may now be used up.
        void queryClient.invalidateQueries({ queryKey: ['toli', toli.id] });
        void queryClient.invalidateQueries({ queryKey: ['hands', toli.id] });
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 'NETWORK')) {
          // The server said no (e.g. you can't post now): don't keep retrying.
          updateQueue((q) => q.filter((x) => x.clientId !== item.clientId));
          setError(e instanceof Error ? e.message : 'Couldn’t send that.');
        }
      } finally {
        sending.current.delete(item.clientId);
      }
    },
    [toli.id, queryClient, updateQueue],
  );

  // Resend what's waiting when the signal comes back (and once on opening).
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => {
    const resend = () => queueRef.current.forEach((item) => void trySend(item));
    resend();
    window.addEventListener('online', resend);
    return () => window.removeEventListener('online', resend);
  }, [trySend]);

  // Mark the chat read on opening and whenever new messages arrive.
  const lastId = messages.data?.at(-1)?.id;
  useEffect(() => {
    if (!lastId) return;
    void toliApi
      .markRead(toli.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['tolis'] }))
      .catch(() => undefined);
  }, [lastId, toli.id, queryClient]);

  /** Queue a new message and try to send it. */
  function onSend(message: { text: string; replyTo?: string; photoIds: string[] }) {
    const item: Queued = { clientId: newClientId(), ...message };
    setError('');
    setReplyTo(null);
    updateQueue((q) => [...q, item]);
    void trySend(item);
  }

  return (
    <div className="grid gap-4">
      {leads && toli.announcementMode && <RaisedHands toli={toli} />}
      <section aria-label="Chaupal" className="glass-strong grid gap-4 rounded-card p-4 sm:p-5">
        {messages.isPending ? (
          <p role="status" className="text-soft">
            Opening the {w.chaupal}…
          </p>
        ) : messages.isError ? (
          <p role="alert" className="text-danger">
            Couldn’t load the messages. They’ll appear when the connection is back.
          </p>
        ) : (
          <>
            {messages.data.length === 0 && queue.length === 0 && <p className="text-soft">No messages yet — say namaste to the {w.toli} 🙏</p>}
            <MessageList toli={toli} messages={messages.data} pending={queue} meId={user?.id} onReply={setReplyTo} />
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {toli.me.canPost ? <Composer toli={toli} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={onSend} /> : <RaiseHandPanel toli={toli} />}
      </section>
    </div>
  );
}
