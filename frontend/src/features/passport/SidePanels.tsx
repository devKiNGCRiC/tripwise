/**
 * SidePanels.tsx — the passport's side column: quick, useful glances so the page works as
 * a home for your travels.
 *   NextTripPanel     your next trip with its photo and countdown
 *   FriendsPanel      friends at a glance, and requests you can accept right here
 *   LatestMemoryPanel the newest memory you wrote, with its diyas
 *   QuotaPanel        today's AI plans left
 */
import type { ReactNode } from 'react';
import { ArrowRight, CalendarDays, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button, buttonClasses } from '@/components/ui/Button';
import { useFriendAction, useFriends } from '@/features/friends/hooks';
import { useTrips } from '@/features/trips/hooks';
import { rangeLabel } from '@/features/trips/format';
import { PlaceCard } from '@/features/trips/PlaceCard';
import { tripStatus } from '@/features/trips/status';
import { useTripPlace } from '@/features/trips/useTripWorld';
import { friendsApi } from '@/lib/api/endpoints';
import type { Stamp } from '@/lib/api/types';
import { sizedImage } from '@/lib/utils/images';
import { DiyaRating } from './DiyaRating';
import { useJournal } from './hooks';
import { QuotaMeter } from './QuotaMeter';

/** A titled card in the side column (a labelled region). */
function Panel({ title, icon, children, footer }: { title: string; icon: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-label={title} className="glass-strong rounded-card p-5">
      <h2 className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-soft uppercase [font-family:var(--trip-font-body)]">
        {icon}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-4 border-t border-line pt-3">{footer}</div>}
    </section>
  );
}

/** A small "see more" link at the bottom of a panel. */
function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
      {children} <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Your next trip (the soonest one that hasn't ended). */
export function NextTripPanel() {
  const { data: trips } = useTrips();
  const next = trips
    ?.filter((t) => tripStatus(t.request.startDate, t.request.endDate).phase !== 'past')
    .sort((a, b) => a.request.startDate.localeCompare(b.request.startDate))[0];
  const place = useTripPlace(next?.request.destination);

  return (
    <Panel title="Next trip" icon={<CalendarDays aria-hidden className="size-4" />}>
      {next ? (
        <Link to={`/trips/${next.id}`} className="group block overflow-hidden rounded-2xl">
          <div className="relative h-32 overflow-hidden rounded-2xl">
            {place ? (
              <img src={sizedImage(place.image.url, 700)} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <PlaceCard name={next.request.destination} className="[&>span:last-child]:text-3xl" />
            )}
            <span className="absolute top-2.5 left-2.5 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-on-accent">
              {tripStatus(next.request.startDate, next.request.endDate).label}
            </span>
          </div>
          <p className="mt-3 font-display text-xl">{next.request.destination}</p>
          <p className="text-sm text-soft">{rangeLabel(next.request.startDate, next.request.endDate)}</p>
        </Link>
      ) : (
        <div className="grid gap-3">
          <p className="text-soft">Nothing planned yet. Where to next?</p>
          <Link to="/plan" className={buttonClasses({ size: 'sm', className: 'justify-self-start' })}>
            Plan a trip
          </Link>
        </div>
      )}
    </Panel>
  );
}

/** Friends at a glance, with requests answered right here. */
export function FriendsPanel() {
  const friends = useFriends();
  const accept = useFriendAction((id: string) => friendsApi.accept(id));
  const data = friends.data;

  return (
    <Panel title="Your friends" icon={<Users aria-hidden className="size-4" />} footer={<MoreLink to="/passport/friends">Friends & invite link</MoreLink>}>
      {!data ? (
        <p className="text-sm text-soft">Loading…</p>
      ) : (
        <div className="grid gap-3">
          {data.incoming.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-accent/10 p-2.5">
              <Avatar name={r.user.name} url={r.user.avatarUrl} className="size-9 text-base" />
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">{r.user.name}</span> wants to be friends
              </p>
              <Button size="sm" aria-label={`Accept ${r.user.name}`} onClick={() => accept.mutate(r.id)} loading={accept.isPending && accept.variables === r.id}>
                Accept
              </Button>
            </div>
          ))}
          {data.friends.length === 0 && data.incoming.length === 0 && <p className="text-sm text-soft">No friends yet — share your invite link with someone you travel with.</p>}
          {data.friends.length > 0 && (
            <ul className="grid gap-2">
              {data.friends.slice(0, 5).map((f) => (
                <li key={f.id}>
                  <Link to={`/u/${f.username}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-ink/5">
                    <Avatar name={f.name} url={f.avatarUrl} className="size-9 text-base" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{f.name}</span>
                      <span className="block truncate text-xs text-soft">
                        @{f.username} · {f.trips} {f.trips === 1 ? 'trip' : 'trips'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

/** The newest memory written (opens its journal). */
export function LatestMemoryPanel({ stamps, onOpen }: { stamps: Stamp[]; onOpen: (stamp: Stamp) => void }) {
  // Stamps are newest first; the first finished one with a memory.
  const latest = stamps.find((s) => s.status === 'completed' && s.journal?.hasMemory);
  const { query } = useJournal(latest?.id ?? null);

  return (
    <Panel title="Latest memory" icon={<span aria-hidden>✍️</span>}>
      {!latest ? (
        <p className="text-sm text-soft">Finish a trip and write how it was — it shows up here.</p>
      ) : (
        <button type="button" onClick={() => onOpen(latest)} className="grid w-full gap-3 text-left">
          {latest.journal?.coverPhotoUrl && <img src={latest.journal.coverPhotoUrl} alt={`A photo from ${latest.destination}`} className="h-28 w-full rounded-2xl bg-ink/8 object-cover" />}
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-xl">{latest.destination}</p>
            <DiyaRating value={latest.journal?.rating ?? null} label="Rating" size="sm" />
          </div>
          <p className="line-clamp-3 text-sm text-soft italic">{query.data ? `“${query.data.memory}”` : '…'}</p>
        </button>
      )}
    </Panel>
  );
}

/** Today's AI plans left. */
export function QuotaPanel() {
  return (
    <Panel title="AI plans today" icon={<Sparkles aria-hidden className="size-4" />}>
      <QuotaMeter compact />
    </Panel>
  );
}
