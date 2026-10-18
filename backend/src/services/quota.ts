/**
 * quota.ts — daily AI allowances, counted per India-time day.
 *
 * Before calling the AI we *reserve* one unit; if the AI fails we *refund* it, so a
 * traveller never loses a plan to an outage. Reserving is a single atomic database update
 * that only succeeds while the count is under the limit — so two requests racing for the
 * last plan can't both win.
 */
import { Usage } from '../db/models/index.js';
import { PLANS, type PlanName } from '../config/plans.js';
import type { Quota } from '../types/api.js';

/** What can be counted. */
export type QuotaKind = 'plans' | 'regens';

/** India is UTC+5:30 all year (no daylight saving). */
const IST_OFFSET_MS = 330 * 60 * 1000;

/** Today's date in India as "YYYY-MM-DD". */
export function istDay(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The moment the next India-time day starts (when allowances reset). */
export function nextIstMidnight(now: Date): Date {
  const [year, month, day] = istDay(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1) - IST_OFFSET_MS);
}

/** The daily limit for a plan and kind. */
function limitFor(plan: PlanName, kind: QuotaKind): number {
  return kind === 'plans' ? PLANS[plan].plansPerDay : PLANS[plan].regensPerDay;
}

/** Today's AI-plan allowance for a traveller (what the website shows). */
export async function getQuota(userId: string, plan: PlanName, now: Date): Promise<Quota> {
  const usage = await Usage.findOne({ userId, day: istDay(now) }).lean();
  return { used: usage?.plans ?? 0, limit: PLANS[plan].plansPerDay, resetsAt: nextIstMidnight(now).toISOString() };
}

/** Is this a MongoDB "duplicate key" error? */
const isDuplicateKey = (error: unknown) => (error as { code?: number }).code === 11000;

/**
 * Take one unit of today's allowance. Returns false when it is used up.
 *
 * One update does both the check and the count: it only matches while the count is below
 * the limit. If nothing matches, the upsert tries to create today's record — and the unique
 * (user, day) index makes that fail when the record exists but is full → "no".
 * The very first request of a day can also hit that duplicate error if two arrive together;
 * one retry (when the record certainly exists) settles it correctly.
 */
export async function reserve(userId: string, plan: PlanName, kind: QuotaKind, now: Date): Promise<boolean> {
  const filter = { userId, day: istDay(now), [kind]: { $lt: limitFor(plan, kind) } };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await Usage.updateOne(filter, { $inc: { [kind]: 1 } }, { upsert: true });
      return true;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }
  return false;
}

/** Give one unit back (the AI failed or the traveller left); never goes below zero. */
export async function refund(userId: string, kind: QuotaKind, now: Date): Promise<void> {
  await Usage.updateOne({ userId, day: istDay(now), [kind]: { $gt: 0 } }, { $inc: { [kind]: -1 } });
}
