/**
 * PassportPage.tsx — route /passport: your passport, in three parts — who you are (the navy
 * cover with your photo, bio and numbers), where you've been (India's seven worlds and your
 * Yatra marks), and what you remember (visa pages whose stamps open trip journals).
 * The page uses the same width as the navbar; beside the main column sits a side column
 * (next trip, friends, latest memory, AI plans today). Settings live on the Account tab.
 */
import { useState } from 'react';
import { Settings, Users } from 'lucide-react';
import { Link } from 'react-router';
import { LoadError } from '@/components/layout/LoadError';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFriends } from '@/features/friends/hooks';
import { usePassport } from '@/features/passport/hooks';
import { JournalSheet } from '@/features/passport/JournalSheet';
import { PassportView } from '@/features/passport/PassportView';
import { FriendsPanel, LatestMemoryPanel, NextTripPanel, QuotaPanel } from '@/features/passport/SidePanels';
import type { Stamp } from '@/lib/api/types';

/** The two buttons on your own cover. */
function CoverActions() {
  const friends = useFriends();
  const waiting = friends.data?.incoming.length ?? 0;
  const count = friends.data?.friends.length;
  return (
    <>
      <Link to="/passport/account" className="inline-flex items-center gap-1.5 rounded-full bg-[#e6b765] px-4 py-2 text-sm font-semibold text-[#0f1a40] hover:brightness-105">
        <Settings aria-hidden className="size-4" />
        Edit profile
      </Link>
      <Link to="/passport/friends" className="relative inline-flex items-center gap-1.5 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
        <Users aria-hidden className="size-4" />
        Friends{count !== undefined && ` · ${count}`}
        {waiting > 0 && (
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-danger text-[11px] text-white" aria-label={`${waiting} friend ${waiting === 1 ? 'request' : 'requests'}`}>
            {waiting}
          </span>
        )}
      </Link>
    </>
  );
}

/** Route "/passport". */
export default function PassportPage() {
  const passport = usePassport();
  const [open, setOpen] = useState<Stamp | null>(null);

  return (
    <div className="page-wrap pt-28 pb-20">
      <title>Your passport · TripWise</title>
      {passport.isPending && (
        <div role="status" className="grid gap-6">
          <span className="sr-only">Opening your passport…</span>
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      )}
      {passport.isError && <LoadError what="your passport" onRetry={() => void passport.refetch()} />}
      {passport.data && (
        <PassportView
          passport={passport.data}
          mine
          coverActions={<CoverActions />}
          onOpenStamp={setOpen}
          sidebar={
            <>
              <NextTripPanel />
              <FriendsPanel />
              <LatestMemoryPanel stamps={passport.data.stamps} onOpen={setOpen} />
              <QuotaPanel />
            </>
          }
        />
      )}
      {open && <JournalSheet key={open.id} stamp={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
