/**
 * FindByUsername.tsx — "Add by username": type someone's exact @username, see their card,
 * send a request. There's no browsing or searching of strangers on purpose.
 */
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AccountSection, FormError } from '@/features/account/AccountSection';
import { friendsApi, usersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { Card, Relation } from '@/lib/api/types';
import { FriendCard } from './FriendCard';
import { useFriendAction } from './hooks';

/** The add-by-username section. */
export function FindByUsername() {
  const [name, setName] = useState('');
  const [found, setFound] = useState<{ card: Card; relation: Relation } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const send = useFriendAction((username: string) => friendsApi.request(username));

  /** Look the username up. */
  async function find(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFound(null);
    const username = name.trim().replace(/^@/, '');
    if (!username) return;
    setLooking(true);
    try {
      setFound(await usersApi.card(username));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLooking(false);
    }
  }

  /** Send the request (or accept theirs). */
  async function request() {
    if (!found) return;
    try {
      const { relation } = await send.mutateAsync(found.card.username);
      setFound({ ...found, relation });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <AccountSection title="Add by username" lede="Ask a friend for their @username — it's on their passport.">
      <form onSubmit={find} className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <Input label="Username" value={name} onChange={(e) => setName(e.target.value)} placeholder="@meera" autoComplete="off" />
        </div>
        <Button type="submit" loading={looking}>
          Find
        </Button>
      </form>
      <div className="mt-4 grid gap-3">
        <FormError message={error} />
        {found && (
          <FriendCard card={found.card}>
            {found.relation === 'friend' && <span className="font-semibold text-accent">Friends ✓</span>}
            {found.relation === 'pending-out' && <span className="font-semibold text-soft">Request sent</span>}
            {(found.relation === 'none' || found.relation === 'pending-in') && (
              <Button size="sm" onClick={request} loading={send.isPending}>
                {found.relation === 'pending-in' ? 'Accept request' : 'Send request'}
              </Button>
            )}
          </FriendCard>
        )}
      </div>
    </AccountSection>
  );
}
