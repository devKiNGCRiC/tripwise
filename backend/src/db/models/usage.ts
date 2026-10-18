/**
 * usage.ts — how much of today's allowance a traveller has used.
 * One record per user per India-time day ("2026-10-18"), counting full AI plans and
 * "new idea" day regenerations separately. Old days delete themselves after 3 days.
 */
import { model, Schema, type InferSchemaType } from 'mongoose';

/** One user's usage for one day. */
const usageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  plans: { type: Number, default: 0 },
  regens: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 3 * 24 * 60 * 60 },
});

// Exactly one record per user per day (the quota service relies on this).
usageSchema.index({ userId: 1, day: 1 }, { unique: true });

/** Plain fields of a usage record. */
export type UsageFields = InferSchemaType<typeof usageSchema>;
/** The usage collection. */
export const Usage = model('Usage', usageSchema);
