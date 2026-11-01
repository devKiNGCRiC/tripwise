/**
 * ChaupalTab.tsx — the Toli's chat (Chaupal). Messages refresh every few seconds and are marked
 * read while the tab is open (which clears the unread dot on the Tolis link). Sending never
 * loses a message: it waits on the phone until the server has it (useOutbox), and is resent by
 * itself when the signal comes back — each with its own id, so a retry is stored only once.
 * In announcement mode, Sahyatris who can't write raise a hand instead; leaders see the
 * raised hands above the chat.
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { ChaupalMessage, Toli } from '@/lib/api/types';
import { Composer } from './Composer';
import { MessageList, type PendingMessage } from './MessageList';
import { RaiseHandPanel, RaisedHands } from './RaiseHand';
import { newClientId, useOutbox } from './useOutbox';

/** How often the chat checks for new messages. */
export const CHAT_REFRESH_MS = 3000;

/** A message waiting on the phone, with its photos. */
type Queued = PendingMessage & { photoIds: string[] };

/** The Chaupal tab. */
export function ChaupalTab({ toli }: { toli: Toli }) {
  const { w } = useWords();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messages = useQuery({ queryKey: ['messages', toli.id], queryFn: () => toliApi.messages(toli.id), select: (d) => d.messages, refetchInterval: CHAT_REFRESH_MS });
  const [replyTo, setReplyTo] = useState<ChaupalMessage | null>(null);
  const leads = toli.me.role !== 'sahyatri';
  // Messages wait on the phone until sent ("outbox" keeps the key messages were saved under before).
  const outbox = useOutbox<Queued>(
    'outbox',
    toli.id,
    (item) => toliApi.send(toli.id, { text: item.text, clientId: item.clientId, ...(item.replyTo ? { replyTo: item.replyTo } : {}), ...(item.photoIds.length ? { photoIds: item.photoIds } : {}) }),
    () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', toli.id] });
      // A one-message permission may now be used up.
      void queryClient.invalidateQueries({ queryKey: ['toli', toli.id] });
      void queryClient.invalidateQueries({ queryKey: ['hands', toli.id] });
    },
  );
  const queue = outbox.queue;

  // Mark the chat read on opening and whenever new messages arrive.
  const lastId = messages.data?.at(-1)?.id;
  useEffect(() => {
    if (!lastId) return;
    void toliApi
      .markRead(toli.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['tolis'] }))
      .catch(() => undefined);
  }, [lastId, toli.id, queryClient]);

  /** Keep a new message and try to send it. */
  function onSend(message: { text: string; replyTo?: string; photoIds: string[] }) {
    setReplyTo(null);
    outbox.add({ clientId: newClientId(), ...message });
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
        {outbox.error && (
          <p role="alert" className="text-sm text-danger">
            {outbox.error}
          </p>
        )}
        {toli.me.canPost ? <Composer toli={toli} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={onSend} /> : <RaiseHandPanel toli={toli} />}
      </section>
    </div>
  );
}
