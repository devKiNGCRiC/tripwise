/**
 * TolisPage.tsx — route /tolis: Your Tolis (each with its Sahyatris, the shared trip, unread
 * chat and what's waiting to be decided) and "Start a Toli". `?trip=<id>` starts a Toli from
 * that trip.
 */
import { MessageCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { LoadError } from '@/components/layout/LoadError';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { CreateToli } from '@/features/toli/CreateToli';
import { useTolis } from '@/features/toli/hooks';
import { ROLE_LABEL, TYPE_LABEL } from '@/features/toli/labels';
import type { Toli } from '@/lib/api/types';

/** One Toli in the list. */
function ToliCard({ toli }: { toli: Toli }) {
  return (
    <Link to={`/tolis/${toli.id}`} className="glass-strong grid gap-3 rounded-card p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl">{toli.name}</h2>
        <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold">{TYPE_LABEL[toli.type]}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex">
          {toli.members.slice(0, 4).map((m, i) => (
            <Avatar key={m.id} name={m.name} url={m.avatarUrl} className={i ? '-ml-2 size-8 border-2 border-white text-sm' : 'size-8 border-2 border-white text-sm'} />
          ))}
        </div>
        <span className="text-sm text-soft">
          {toli.memberCount} {toli.memberCount === 1 ? 'Sahyatri' : 'Sahyatris'} · you’re the {ROLE_LABEL[toli.me.role]}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {toli.announcementMode && <span className="rounded-full bg-ink/6 px-3 py-1">📣 Announcement mode</span>}
        {!!toli.unread && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 font-semibold text-on-accent">
            <MessageCircle aria-hidden className="size-3.5" /> {toli.unread} new in Chaupal
          </span>
        )}
        {!toli.tripId && <span className="rounded-full bg-ink/6 px-3 py-1">No Sahyatra yet — decide together</span>}
      </div>
    </Link>
  );
}

/** Route "/tolis". */
export default function TolisPage() {
  const tolis = useTolis();
  const [params] = useSearchParams();
  const fromTrip = params.get('trip') ?? undefined;

  return (
    <div className="page-wrap pt-28 pb-20">
      <title>Your Tolis · TripWise</title>
      <PageHeader eyebrow="टोली · Toli · plan trips together" title="Your Tolis" lede="Decide, plan and travel together: suggestions, polls, a private budget check and your own Chaupal chat." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {tolis.isPending && <Skeleton className="h-40 rounded-card" />}
          {tolis.isError && <LoadError what="your Tolis" onRetry={() => void tolis.refetch()} />}
          {tolis.data?.length === 0 && <p className="glass rounded-card p-6 text-soft">No Tolis yet. Start one and invite your people.</p>}
          {tolis.data?.map((t) => (
            <ToliCard key={t.id} toli={t} />
          ))}
        </div>
        <CreateToli fromTrip={fromTrip} />
      </div>
    </div>
  );
}
