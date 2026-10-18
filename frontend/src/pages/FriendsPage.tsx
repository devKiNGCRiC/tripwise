/**
 * FriendsPage.tsx — route /passport/friends: your invite link, add by @username, requests
 * waiting for you (Accept / Decline) and the ones you sent (Cancel), and your friends, each
 * with a small menu to remove or block.
 */
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadError } from '@/components/layout/LoadError';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccountSection } from '@/features/account/AccountSection';
import { FindByUsername } from '@/features/friends/FindByUsername';
import { FriendCard } from '@/features/friends/FriendCard';
import { useFriendAction, useFriends } from '@/features/friends/hooks';
import { InviteLink } from '@/features/friends/InviteLink';
import { friendsApi } from '@/lib/api/endpoints';

/** Route "/passport/friends". */
export default function FriendsPage() {
  const friends = useFriends();
  const accept = useFriendAction((id: string) => friendsApi.accept(id));
  const decline = useFriendAction((id: string) => friendsApi.decline(id));
  const cancel = useFriendAction((id: string) => friendsApi.cancel(id));
  const remove = useFriendAction((userId: string) => friendsApi.remove(userId));
  const block = useFriendAction((userId: string) => friendsApi.block(userId));
  const data = friends.data;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-20">
      <title>Friends · TripWise</title>
      <Link to="/passport" className="glass mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold">
        <ArrowLeft aria-hidden className="size-4" /> Your passport
      </Link>
      <PageHeader eyebrow="दोस्त · Friends" title="Your travel circle" lede="Friends can see your passport (unless you choose Only me). Plan trips together soon in Crew mode." />

      <div className="grid gap-6">
        <InviteLink />
        <FindByUsername />

        {friends.isPending && <Skeleton className="h-40 rounded-card" />}
        {friends.isError && <LoadError what="your friends" onRetry={() => void friends.refetch()} />}
        {data && (
          <>
            <AccountSection title="Requests">
              {data.incoming.length === 0 && data.sent.length === 0 && <p className="text-soft">No requests right now.</p>}
              <div className="grid gap-3">
                {data.incoming.map((r) => (
                  <FriendCard key={r.id} card={r.user}>
                    <Button size="sm" aria-label={`Accept ${r.user.name}`} onClick={() => accept.mutate(r.id)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Decline ${r.user.name}`} onClick={() => decline.mutate(r.id)}>
                      Decline
                    </Button>
                  </FriendCard>
                ))}
                {data.sent.map((r) => (
                  <FriendCard key={r.id} card={r.user}>
                    <span className="text-sm text-soft">Waiting</span>
                    <Button size="sm" variant="ghost" aria-label={`Cancel request to ${r.user.name}`} onClick={() => cancel.mutate(r.id)}>
                      Cancel
                    </Button>
                  </FriendCard>
                ))}
              </div>
            </AccountSection>

            <AccountSection title="Friends" lede={`${data.friends.length} ${data.friends.length === 1 ? 'friend' : 'friends'}`}>
              {data.friends.length === 0 && <p className="text-soft">No friends yet — send your invite link to someone you travel with.</p>}
              <ul className="grid gap-3">
                {data.friends.map((friend) => (
                  <li key={friend.id}>
                    <FriendCard card={friend}>
                      {/* A small menu, so removing or blocking is never one mis-tap away */}
                      <details className="relative">
                        <summary aria-label={`More for ${friend.name}`} className="grid size-9 cursor-pointer list-none place-items-center rounded-full hover:bg-ink/6">
                          <MoreHorizontal aria-hidden className="size-5" />
                        </summary>
                        <div className="glass-strong absolute right-0 z-10 mt-1 grid w-44 gap-1 rounded-2xl p-1.5">
                          <button type="button" onClick={() => remove.mutate(friend.id)} className="rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-ink/6">
                            Remove friend
                          </button>
                          <button type="button" onClick={() => block.mutate(friend.id)} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger/10">
                            Block
                          </button>
                        </div>
                      </details>
                    </FriendCard>
                  </li>
                ))}
              </ul>
            </AccountSection>
          </>
        )}
      </div>
    </div>
  );
}
