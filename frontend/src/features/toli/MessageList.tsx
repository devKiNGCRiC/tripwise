/**
 * MessageList.tsx — the messages in a Toli's chat (Chaupal), oldest first: who wrote it, the
 * message with @mentions highlighted, what it replies to, its photos, and a Reply button.
 * Trip cards appear as the real thing — a poll you can vote on, a suggestion you can vote on —
 * and messages still waiting for signal show at the end.
 */
import { Reply } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { toliApi } from '@/lib/api/endpoints';
import type { ChaupalMessage, Toli } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { PollCard } from './PollCard';
import { SujhavCard } from './SujhavCard';

/** A message the phone is still trying to send. */
export interface PendingMessage {
  clientId: string;
  text: string;
  replyTo?: string;
}

/** The text with @mentions of members highlighted. */
function withMentions(text: string, usernames: Set<string>) {
  return text.split(/(@[a-z0-9_]{3,20})/gi).map((part, i) =>
    part.startsWith('@') && usernames.has(part.slice(1).toLowerCase()) ? (
      <mark key={i} className="rounded bg-accent/15 px-0.5 font-semibold text-accent">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** A trip card shown as the real, live thing. */
function LiveCard({ toli, card }: { toli: Toli; card: NonNullable<ChaupalMessage['card']> }) {
  const polls = useQuery({ queryKey: ['polls', toli.id], queryFn: () => toliApi.polls(toli.id), select: (d) => d.polls, enabled: card.type === 'poll' });
  const sujhavs = useQuery({ queryKey: ['sujhavs', toli.id], queryFn: () => toliApi.sujhavs(toli.id), select: (d) => d.sujhavs, enabled: card.type === 'sujhav' });
  const poll = card.type === 'poll' ? polls.data?.find((p) => p.id === card.id) : undefined;
  const sujhav = card.type === 'sujhav' ? sujhavs.data?.find((s) => s.id === card.id) : undefined;
  if (poll) return <PollCard toli={toli} poll={poll} />;
  if (sujhav) return <SujhavCard toli={toli} sujhav={sujhav} />;
  return <p className="rounded-2xl border border-line px-4 py-3 text-sm">{card.title}</p>;
}

/** The chat's messages. */
export function MessageList({ toli, messages, pending, meId, onReply }: { toli: Toli; messages: ChaupalMessage[]; pending: PendingMessage[]; meId?: string; onReply: (m: ChaupalMessage) => void }) {
  const usernames = new Set(toli.members.map((m) => m.username.toLowerCase()));

  return (
    <ol aria-label="Messages" className="grid gap-3">
      {messages.map((m) => {
        const mine = m.author.id === meId;
        if (m.card) {
          return (
            <li key={m.id} className="grid gap-1">
              <p className="text-xs text-soft">{m.author.name} shared</p>
              <LiveCard toli={toli} card={m.card} />
            </li>
          );
        }
        return (
          <li key={m.id} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
            {!mine && <Avatar name={m.author.name} url={m.author.avatarUrl} className="mt-1 size-8 text-sm" />}
            <article aria-label={`${m.author.name}: ${m.text.slice(0, 60)}`} className={cn('grid max-w-[85%] gap-1 rounded-2xl px-3.5 py-2.5 shadow-sm', mine ? 'rounded-br-md bg-accent text-on-accent' : 'rounded-bl-md bg-white/85 dark:bg-white/10')}>
              {!mine && <p className="text-xs font-bold text-accent">{m.author.name}</p>}
              {m.replyTo && (
                <p className={cn('rounded-lg border-l-2 px-2 py-1 text-xs', mine ? 'border-white/60 bg-white/15' : 'border-accent bg-ink/5')}>
                  ↩ {m.replyTo.authorName}: {m.replyTo.text}
                </p>
              )}
              {m.text && <p className="whitespace-pre-wrap break-words">{withMentions(m.text, usernames)}</p>}
              {m.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {m.photos.map((p) => (
                    <img key={p.id} src={p.url} alt={`Photo from ${m.author.name}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 text-[11px] opacity-75">
                <span>{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                <button type="button" onClick={() => onReply(m)} aria-label={`Reply to ${m.author.name}`} className="inline-flex items-center gap-1 font-semibold hover:underline">
                  <Reply aria-hidden className="size-3" /> Reply
                </button>
              </div>
            </article>
          </li>
        );
      })}
      {pending.map((p) => (
        <li key={p.clientId} className="flex flex-row-reverse">
          <article aria-label={`Waiting to send: ${p.text.slice(0, 60)}`} className="grid max-w-[85%] gap-1 rounded-2xl rounded-br-md bg-accent/50 px-3.5 py-2.5 text-on-accent">
            <p className="whitespace-pre-wrap break-words">{p.text}</p>
            <p className="text-[11px]">⏳ Waiting for signal — it will send by itself</p>
          </article>
        </li>
      ))}
    </ol>
  );
}
