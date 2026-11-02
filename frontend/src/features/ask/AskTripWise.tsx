/**
 * AskTripWise.tsx — a question box on a trip. Ask anything about this trip (or tap a suggested
 * question); TripWise answers from the trip, real places nearby and the forecast, with chips for
 * the places it mentions and follow-up questions to tap. Your conversation is yours alone (even
 * on a Toli's shared trip). Shows how many questions are left today; "Start over" clears it.
 */
import { useState, type FormEvent } from 'react';
import { MessageCircleQuestion, RotateCcw, Send } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { askApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { AskMessage, Quota } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';

/** Questions to start with. */
const SUGGESTED = ['What’s worth seeing near our stops?', 'Is it too hot at midday?', 'Where can we eat nearby?', 'What should I pack?'];

/** One message. */
function Message({ message, onAsk, busy }: { message: AskMessage; onAsk: (q: string) => void; busy: boolean }) {
  const mine = message.role === 'user';
  return (
    <article aria-label={mine ? 'You' : 'TripWise'} className={cn('grid max-w-[90%] gap-2 rounded-2xl px-4 py-3', mine ? 'justify-self-end rounded-br-md bg-accent text-on-accent' : 'rounded-bl-md bg-white/80 dark:bg-white/10')}>
      <p className="whitespace-pre-wrap">{message.text}</p>
      {message.places && message.places.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.places.map((p) => (
            <Link key={p.id} to={`/destinations/${p.destination}`} className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold hover:bg-accent/20">
              📍 {p.name}
            </Link>
          ))}
        </div>
      )}
      {message.followUps && message.followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.followUps.map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => onAsk(q)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-ink/6 disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
      )}
      {message.weatherCredit && <p className="text-[11px] text-soft">Weather: MET Norway</p>}
    </article>
  );
}

/** The question box for a trip. */
export function AskTripWise({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const key = ['ask', tripId];
  const history = useQuery({ queryKey: key, queryFn: () => askApi.history(tripId) });
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const messages = history.data?.messages ?? [];
  const quota = history.data?.quota;

  /** Ask one question; show it at once, then the answer. */
  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setError('');
    setQuestion('');
    const mine: AskMessage = { role: 'user', text: q, at: new Date().toISOString() };
    queryClient.setQueryData<{ messages: AskMessage[]; quota: Quota }>(key, (old) => old && { ...old, messages: [...old.messages, mine] });
    try {
      const { reply, quota: next } = await askApi.ask(tripId, q);
      queryClient.setQueryData<{ messages: AskMessage[]; quota: Quota }>(key, (old) => old && { messages: [...old.messages, reply], quota: next });
    } catch (e) {
      // The question didn't go through: take it back off the screen.
      queryClient.setQueryData<{ messages: AskMessage[]; quota: Quota }>(key, (old) => old && { ...old, messages: old.messages.filter((m) => m !== mine) });
      setError(e instanceof ApiError && e.code === 'AI_UNAVAILABLE' ? 'TripWise is busy right now — try again in a minute.' : e instanceof Error ? e.message : 'Couldn’t ask that.');
      setQuestion(q);
    } finally {
      setBusy(false);
    }
  }

  /** Clear the conversation. */
  async function startOver() {
    await askApi.clear(tripId);
    void queryClient.invalidateQueries({ queryKey: key });
  }

  /** Ask what's typed. */
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section aria-label="Ask TripWise" className="glass-strong mt-6 grid gap-3 rounded-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-2xl">
          <MessageCircleQuestion aria-hidden className="size-6" /> Ask TripWise
        </h2>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" icon={<RotateCcw aria-hidden className="size-4" />} onClick={() => void startOver()}>
            Start over
          </Button>
        )}
      </div>
      <p className="text-sm text-soft">Questions about this trip — answered from your plan, real places nearby and the forecast. Only you see your questions.</p>

      {messages.length === 0 && !history.isPending && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => void ask(q)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-ink/6 disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-2">
        {messages.map((m, i) => (
          <Message key={`${m.at}-${i}`} message={m} onAsk={(q) => void ask(q)} busy={busy} />
        ))}
        {busy && (
          <p role="status" className="text-sm text-soft">
            TripWise is thinking…
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Your question</span>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder="Is the fort open on Monday?" className="h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5" />
        </label>
        <Button type="submit" aria-label="Ask" disabled={busy || !question.trim()} className="size-11 shrink-0 px-0">
          <Send aria-hidden className="size-4" />
        </Button>
      </form>
      {quota && <p className="text-xs text-soft">{`${Math.max(0, quota.limit - quota.used)} of ${quota.limit} questions left today`}</p>}
    </section>
  );
}
