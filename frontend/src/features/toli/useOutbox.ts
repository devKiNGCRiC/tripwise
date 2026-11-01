/**
 * useOutbox.ts — anything written in a Toli without signal (a chat message, an expense, a
 * settlement) is kept on the phone until the server has it, and is resent by itself when the
 * signal comes back (and whenever the screen opens). Each item carries an id made on the phone,
 * so a retry is stored only once. Kept per account, so a shared phone never sends one person's
 * items as someone else. If the server refuses an item (not just "no signal"), it is dropped
 * and the reason shown, rather than retried for ever.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { ApiError } from '@/lib/api/errors';

/** Read waiting items (storage may be unavailable). */
function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

/** Save waiting items. */
function save<T>(key: string, queue: T[]) {
  try {
    if (queue.length) localStorage.setItem(key, JSON.stringify(queue));
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked: the queue still lives in memory for this visit.
  }
}

/** A fresh id for something made on this phone. */
export function newClientId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2)}`;
}

/** A per-account, per-Toli outbox named `name` (e.g. "outbox" for Chaupal, "expenses"). */
export function useOutbox<T extends { clientId: string }>(name: string, toliId: string, send: (item: T) => Promise<unknown>, onSent: () => void) {
  const { user } = useAuth();
  const key = `tripwise:toli-${name}:${user?.id ?? 'signed-out'}:${toliId}`;
  const [queue, setQueue] = useState<T[]>(() => load<T>(key));
  const [error, setError] = useState('');
  const sending = useRef(new Set<string>());
  // The latest send/onSent, without restarting the resend effect every render.
  const sendRef = useRef(send);
  const onSentRef = useRef(onSent);
  sendRef.current = send;
  onSentRef.current = onSent;

  /** Change the queue and keep the phone's copy in step. */
  const update = useCallback(
    (change: (q: T[]) => T[]) =>
      setQueue((q) => {
        const next = change(q);
        save(key, next);
        return next;
      }),
    [key],
  );

  /** Try to send one item; it stays queued only when there's no signal. */
  const trySend = useCallback(
    async (item: T) => {
      if (sending.current.has(item.clientId)) return;
      sending.current.add(item.clientId);
      try {
        await sendRef.current(item);
        update((q) => q.filter((x) => x.clientId !== item.clientId));
        onSentRef.current();
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 'NETWORK')) {
          // The server said no: don't keep retrying.
          update((q) => q.filter((x) => x.clientId !== item.clientId));
          setError(e instanceof Error ? e.message : 'Couldn’t send that.');
        }
      } finally {
        sending.current.delete(item.clientId);
      }
    },
    [update],
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

  /** Keep a new item and try to send it straight away. */
  const add = useCallback(
    (item: T) => {
      setError('');
      update((q) => [...q, item]);
      void trySend(item);
    },
    [update, trySend],
  );

  return { queue, add, error, clearError: () => setError('') };
}
