/**
 * labels.ts (toli) — how Toli words read on screen: roles, kinds of trip, and the tabs of a
 * Toli page. Hindi/Sanskrit names, each with a plain-English line where it first appears.
 */
import type { Words } from '@/features/words/words';
import type { ToliRole, TripType } from '@/lib/api/types';

/** A role in the chosen names (Indian or English). */
export function roleLabel(w: Words, role: ToliRole): string {
  return role === 'sutradhar' ? w.sutradhar : role === 'sah' ? w.sah : w.sahyatri;
}

/** Kinds of trip (college and office are for adults). */
export const TYPE_LABEL: Record<TripType, string> = { friends: 'Friends', family: 'Family', college: 'College · 18+', office: 'Office · 18+' };

/** The tabs of a Toli page, in order. */
export const TAB_KEYS = ['sahyatra', 'decide', 'lekha', 'chaupal', 'sahyatris', 'activity'] as const;
/** A tab's key. */
export type ToliTab = (typeof TAB_KEYS)[number];

/** The tabs with their names (Indian or English). */
export function tabsFor(w: Words): { key: ToliTab; label: string }[] {
  const label: Record<ToliTab, string> = { sahyatra: w.sahyatraTab, decide: 'Decide', lekha: w.lekha, chaupal: w.chaupalTab, sahyatris: w.sahyatris, activity: 'Activity' };
  return TAB_KEYS.map((key) => ({ key, label: label[key] }));
}
