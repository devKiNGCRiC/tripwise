/**
 * labels.ts (toli) — how Toli words read on screen: roles, kinds of trip, and the tabs of a
 * Toli page. Hindi/Sanskrit names, each with a plain-English line where it first appears.
 */
import type { ToliRole, TripType } from '@/lib/api/types';

/** Roles. */
export const ROLE_LABEL: Record<ToliRole, string> = { sutradhar: 'Sutradhar', sah: 'Sah-Sutradhar', sahyatri: 'Sahyatri' };

/** Kinds of trip (college and office are for adults). */
export const TYPE_LABEL: Record<TripType, string> = { friends: 'Friends', family: 'Family', college: 'College · 18+', office: 'Office · 18+' };

/** The tabs of a Toli page, in order. */
export const TABS = [
  { key: 'sahyatra', label: 'Sahyatra' },
  { key: 'decide', label: 'Decide' },
  { key: 'chaupal', label: 'Chaupal' },
  { key: 'sahyatris', label: 'Sahyatris' },
  { key: 'activity', label: 'Activity' },
] as const;
/** A tab's key. */
export type ToliTab = (typeof TABS)[number]['key'];
