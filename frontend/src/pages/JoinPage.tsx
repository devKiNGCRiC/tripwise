/**
 * JoinPage.tsx — route /join/:code, an invite link someone sent you: see who invited you,
 * then one click to become friends.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { WorldStage } from '@/components/layout/WorldStage';
import { useAuth } from '@/features/auth/AuthProvider';
import { FriendCard } from '@/features/friends/FriendCard';
import { useFriendAction } from '@/features/friends/hooks';
import { usersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';

/** Route "/join/:code". */
export default function JoinPage() {
  const { code = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const invite = useQuery({ queryKey: ['invite', code], queryFn: () => usersApi.invite(code), retry: false });
  const accept = useFriendAction(() => usersApi.acceptInvite(code));
  const [error, setError] = useState<string | null>(null);
  const card = invite.data?.card;
  const own = card && user && card.id === user.id;

  /** Become friends, then go to the friends list. */
  async function join() {
    try {
      const { friend } = await accept.mutateAsync(undefined);
      toast.show({ title: `You and ${friend.name} are now friends`, tone: 'success' });
      navigate('/passport/friends');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <WorldStage>
      <title>Join a friend · TripWise</title>
      <div className="glass-strong mx-auto flex w-full max-w-lg flex-col gap-5 rounded-card p-8 text-center">
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">An invitation</p>
        {invite.isPending && <Skeleton className="h-20 rounded-2xl" />}
        {invite.isError && (
          <>
            <h1 className="font-display text-3xl">This invite link has expired</h1>
            <p className="text-soft">Ask your friend for a fresh link, or add them by @username.</p>
            <Link to="/passport/friends" className={buttonClasses({ variant: 'secondary', className: 'self-center' })}>
              Go to friends
            </Link>
          </>
        )}
        {card && (
          <>
            <h1 className="font-display text-3xl">{own ? 'This is your own invite link' : `${card.name} invited you`}</h1>
            <div className="text-left">
              <FriendCard card={card} />
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
            {!own && (
              <Button onClick={join} loading={accept.isPending} className="self-center">
                Become friends
              </Button>
            )}
          </>
        )}
      </div>
    </WorldStage>
  );
}
