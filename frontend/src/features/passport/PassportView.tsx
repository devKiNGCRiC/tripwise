/**
 * PassportView.tsx — one passport, top to bottom: who you are (the cover), where you've
 * been (seven worlds and Yatra marks), what you remember (the visa pages). Used for your own
 * passport and, read-only, for someone else's.
 */
import type { ReactNode } from 'react';
import type { Passport, Stamp } from '@/lib/api/types';
import { PassportCover } from './PassportCover';
import { VisaPages } from './VisaPages';
import { WorldsPanel } from './WorldsPanel';
import { YatraMarks } from './YatraMarks';

/** A whole passport. `coverActions` go in the cover's corner; `onOpenStamp` opens journals (yours). */
export function PassportView({ passport, mine, coverActions, onOpenStamp, children }: { passport: Passport; mine: boolean; coverActions?: ReactNode; onOpenStamp?: (stamp: Stamp) => void; children?: ReactNode }) {
  return (
    <div className="grid gap-6">
      <PassportCover passport={passport} actions={coverActions} />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <WorldsPanel passport={passport} mine={mine} />
        <YatraMarks passport={passport} />
      </div>
      <VisaPages stamps={passport.stamps} mine={mine} onOpen={onOpenStamp} />
      {children}
    </div>
  );
}
