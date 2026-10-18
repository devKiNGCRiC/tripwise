/**
 * FriendCard.tsx — a traveller's small card: photo, name, @username, type of traveller and
 * finished trips, linking to their passport. `children` holds the card's buttons.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { TRAVELLER_TYPE_LABEL } from '@/features/account/labels';
import type { Card } from '@/lib/api/types';

/** One person's card. */
export function FriendCard({ card, children }: { card: Card; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-ink/4 p-3 pr-4">
      <Avatar name={card.name} url={card.avatarUrl} className="size-12 text-xl" />
      <Link to={`/u/${card.username}`} className="min-w-0 flex-1 hover:underline">
        <p className="truncate font-semibold">{card.name}</p>
        <p className="truncate text-sm text-soft">
          @{card.username}
          {card.travellerType && ` · ${TRAVELLER_TYPE_LABEL[card.travellerType]}`}
          {` · ${card.trips} ${card.trips === 1 ? 'trip' : 'trips'}`}
        </p>
      </Link>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
