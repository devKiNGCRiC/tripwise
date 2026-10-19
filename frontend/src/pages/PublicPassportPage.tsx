/**
 * PublicPassportPage.tsx — route /u/:username: someone's passport, read-only, as their
 * privacy allows (logged-out visitors only see "Everyone" passports). Finished trips only,
 * never upcoming ones. While it's open the world wears the owner's colours.
 */
import { useEffect, useRef } from 'react';
import { Lock, UserPlus } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { useFriendAction } from '@/features/friends/hooks';
import { usePublicPassport } from '@/features/passport/hooks';
import { PassportView } from '@/features/passport/PassportView';
import { friendsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { Relation } from '@/lib/api/types';
import { useWorld } from '@/world/WorldProvider';

/** The button (or badge) on someone's cover, by how you're connected. */
function RelationButton({ username, relation }: { username: string; relation: Relation }) {
  const { status } = useAuth();
  const send = useFriendAction(() => friendsApi.request(username));
  const pill = 'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold';

  if (relation === 'self') return null;
  if (status !== 'authenticated') {
    return (
      <Link to={`/login?next=/u/${username}`} className={`${pill} bg-[#e6b765] text-[#0f1a40]`}>
        Log in to add friend
      </Link>
    );
  }
  if (relation === 'friend') return <span className={`${pill} bg-white/12 text-white`}>Friends ✓</span>;
  if (relation === 'pending-out' || send.data?.relation === 'pending-out') return <span className={`${pill} bg-white/12 text-white`}>Request sent</span>;
  return (
    <button type="button" onClick={() => send.mutate(undefined)} className={`${pill} bg-[#e6b765] text-[#0f1a40]`}>
      <UserPlus aria-hidden className="size-4" />
      {relation === 'pending-in' ? 'Accept request' : 'Add friend'}
    </button>
  );
}

/** Route "/u/:username". */
export default function PublicPassportPage() {
  const { username = '' } = useParams();
  const passport = usePublicPassport(username);
  const { tint, setTint } = useWorld();
  const before = useRef(tint);
  const theme = passport.data?.passport.cover.theme;

  // Wear the owner's colours while here; put yours back on leaving.
  useEffect(() => {
    if (!theme) return;
    const previous = before.current;
    setTint(theme);
    return () => setTint(previous);
  }, [theme, setTint]);

  const isPrivate = passport.error instanceof ApiError && passport.error.code === 'NOT_FOUND';

  return (
    <div className="page-wrap pt-28 pb-20">
      <title>{passport.data ? `${passport.data.passport.cover.name}'s passport · TripWise` : 'Passport · TripWise'}</title>
      {passport.isPending && <Skeleton className="h-80 rounded-card" />}
      {(isPrivate || (passport.isError && !isPrivate)) && (
        <div className="flex min-h-[55vh] items-center">
          <div className="glass-strong mx-auto flex max-w-lg flex-col items-center gap-4 rounded-card p-10 text-center">
            <Lock aria-hidden className="size-8 text-soft" />
            <h1 className="font-display text-3xl">{isPrivate ? 'This passport is private' : "We couldn't load this passport"}</h1>
            <p className="text-soft">{isPrivate ? 'Only people its owner allows can see it.' : 'Please try again in a moment.'}</p>
            <Link to="/explore" className={buttonClasses({ variant: 'secondary' })}>
              Explore places instead
            </Link>
          </div>
        </div>
      )}
      {passport.data && <PassportView passport={passport.data.passport} mine={false} coverActions={<RelationButton username={passport.data.passport.cover.username} relation={passport.data.relation} />} />}
    </div>
  );
}
