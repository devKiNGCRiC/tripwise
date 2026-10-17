/**
 * schema.ts — the planner's rules (Zod), checked step by step as the traveller goes:
 * a destination, sensible dates (not in the past, end on/after start, at most 14 days),
 * a daily budget of at least ₹500, who's travelling, 1–5 interests, and a pace.
 * Also maps the landing page's "who's going" wording onto the API's traveller types.
 */
import { z } from 'zod';
import type { Interest, Pace, Travellers } from '@/lib/api/types';

/** Longest trip the planner will make. */
export const MAX_DAYS = 14;

/** "YYYY-MM-DD" for today, local time. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days between two "YYYY-MM-DD" dates, counting both ends (3rd → 5th = 3). */
export function tripLength(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

export const plannerSchema = z
  .object({
    destination: z.string().trim().min(1, { error: 'Where would you like to go?' }).max(80, { error: 'Keep it under 80 characters' }),
    startDate: z.string().min(1, { error: 'Pick a start date' }),
    endDate: z.string().min(1, { error: 'Pick an end date' }),
    budget: z.number({ error: 'Enter a daily budget' }).min(500, { error: 'Budget must be at least ₹500 a day' }).max(200_000, { error: 'That budget looks too high' }),
    travellers: z.enum(['solo', 'couple', 'friends', 'family']),
    interests: z.array(z.string()).min(1, { error: 'Pick at least one interest' }).max(5, { error: 'Pick up to 5 interests' }),
    pace: z.enum(['chill', 'balanced', 'packed']),
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.startDate < todayIso()) ctx.addIssue({ code: 'custom', path: ['startDate'], message: "Start date can't be in the past" });
    if (v.startDate && v.endDate) {
      const days = tripLength(v.startDate, v.endDate);
      if (days < 1) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' });
      else if (days > MAX_DAYS) ctx.addIssue({ code: 'custom', path: ['endDate'], message: `Trips can be up to ${MAX_DAYS} days` });
    }
  });

/** Form values (the API's TripRequest is built from these on submit). */
export interface PlannerValues {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travellers: Travellers;
  interests: Interest[];
  pace: Pace;
}

/** Landing-page "who's going" words → API traveller types. */
export const WHO_TO_TRAVELLERS: Record<string, Travellers> = {
  'Just me': 'solo',
  Partner: 'couple',
  Friends: 'friends',
  Backpacking: 'friends',
  Family: 'family',
};
