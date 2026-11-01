/**
 * toliBudget.ts — one Sahyatri's private budget comfort for a Toli: the daily range (INR per
 * person) they're happy with. Never shown to anyone else; the Toli only ever sees the overlap
 * (services/toliRules.ts `budgetRange`).
 */
import { model, Schema } from 'mongoose';

/** One member's range. */
const toliBudgetSchema = new Schema(
  {
    toliId: { type: String, required: true },
    userId: { type: String, required: true },
    low: { type: Number, required: true },
    high: { type: Number, required: true },
  },
  { versionKey: false },
);
// One range per member per Toli.
toliBudgetSchema.index({ toliId: 1, userId: 1 }, { unique: true });

/** The budget comfort collection. */
export const ToliBudget = model('ToliBudget', toliBudgetSchema);
