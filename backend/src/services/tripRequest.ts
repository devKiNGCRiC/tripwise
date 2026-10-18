/**
 * tripRequest.ts — checks what the traveller asked for before any AI is called.
 *
 * The rules and messages are the same as the planner form on the website
 * (frontend/src/features/planner/schema.ts), so a request the form accepts is accepted
 * here, and anything else gets the same friendly message. "Today" is judged in India time.
 */
import { z } from 'zod';
import { badRequest } from '../lib/errors.js';
import { daysBetweenInclusive } from '../lib/dates.js';
import type { TripRequest } from '../types/api.js';
import { istDay } from './quota.js';

/** A real calendar date written as YYYY-MM-DD. */
const isoDate = (message: string) =>
  z
    .string({ error: message })
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), message);

/** Field-by-field rules (dates are checked against each other below). */
const tripRequestSchema = z.object({
  destination: z.string({ error: 'Where would you like to go?' }).trim().min(1, 'Where would you like to go?').max(80, 'Keep it under 80 characters'),
  startDate: isoDate('Pick a start date'),
  endDate: isoDate('Pick an end date'),
  budget: z.object(
    {
      amount: z.number({ error: 'Enter a daily budget' }).min(500, 'Budget must be at least ₹500 a day').max(200_000, 'That budget looks too high'),
      currency: z.literal('INR', { error: 'Budgets are in rupees (INR) for now' }),
    },
    { error: 'Enter a daily budget' },
  ),
  travellers: z.enum(['solo', 'couple', 'friends', 'family'], { error: "Tell us who's travelling" }),
  interests: z
    .array(z.enum(['food', 'culture', 'adventure', 'nightlife', 'nature', 'shopping', 'history', 'relaxation', 'photography', 'spiritual']), {
      error: 'Pick at least one interest',
    })
    .min(1, 'Pick at least one interest')
    .max(5, 'Pick up to 5 interests')
    .refine((list) => new Set(list).size === list.length, 'Pick each interest once'),
  pace: z.enum(['chill', 'balanced', 'packed'], { error: 'Pick a pace' }),
});

/** Check a request body; throws 400 with the first problem, in the form's words. */
export function parseTripRequest(body: unknown, now: Date, maxDays: number): TripRequest {
  const result = tripRequestSchema.safeParse(body ?? {});
  if (!result.success) throw badRequest(result.error.issues[0]?.message ?? 'Please check your trip details.');
  const req = result.data;

  // Date rules, exactly as on the form.
  if (req.startDate < istDay(now)) throw badRequest("Start date can't be in the past");
  const days = daysBetweenInclusive(req.startDate, req.endDate);
  if (days < 1) throw badRequest('End date must be on or after the start date');
  if (days > maxDays) throw badRequest(`Trips can be up to ${maxDays} days`);

  return { ...req, budget: { amount: Math.round(req.budget.amount), currency: 'INR' } };
}
