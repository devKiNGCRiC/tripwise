/**
 * plans.ts — what each plan is allowed per day. The one place to change limits.
 * Premium isn't sold yet; its numbers are placeholders until pricing is decided.
 */

/** The plans a traveller can be on. */
export type PlanName = 'free' | 'premium';

/** Daily allowances for one plan. */
export interface PlanLimits {
  /** Full AI-written trip plans per day. */
  plansPerDay: number;
  /** "New idea" single-day regenerations per day. */
  regensPerDay: number;
  /** Longest trip that can be planned. */
  maxDays: number;
}

/** Every plan's limits. */
export const PLANS: Record<PlanName, PlanLimits> = {
  free: { plansPerDay: 5, regensPerDay: 15, maxDays: 14 },
  premium: { plansPerDay: 50, regensPerDay: 150, maxDays: 14 },
};
