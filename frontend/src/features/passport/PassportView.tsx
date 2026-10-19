/**
 * PassportView.tsx — one passport: who you are (the cover, full width), then where you've
 * been (seven worlds and Yatra marks) and what you remember (the visa pages). With a
 * `sidebar` (your own passport) those sit in a main column with the side column beside
 * them on wide screens, below them on phones. Used for your own passport and, read-only,
 * for someone else's.
 */
import type { ReactNode } from 'react';
import type { Passport, Stamp } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { PassportCover } from './PassportCover';
import { VisaPages } from './VisaPages';
import { WorldsPanel } from './WorldsPanel';
import { YatraMarks } from './YatraMarks';

/** A whole passport. */
export function PassportView({
  passport,
  mine,
  coverActions,
  onOpenStamp,
  sidebar,
}: {
  passport: Passport;
  mine: boolean;
  coverActions?: ReactNode;
  onOpenStamp?: (stamp: Stamp) => void;
  sidebar?: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <PassportCover passport={passport} actions={coverActions} />
      <div className={cn('grid items-start gap-6', !!sidebar && 'lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]')}>
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <WorldsPanel passport={passport} mine={mine} />
            <YatraMarks passport={passport} />
          </div>
          <VisaPages stamps={passport.stamps} mine={mine} onOpen={onOpenStamp} />
        </div>
        {sidebar && <aside aria-label="At a glance" className="grid gap-6 lg:sticky lg:top-28">{sidebar}</aside>}
      </div>
    </div>
  );
}
