/**
 * planCache.ts — AI-written plans kept for re-use.
 * One record per "kind of trip" (see services/cache.ts for the key), holding up to 3
 * different plans (variants). Records delete themselves after 30 days so plans stay fresh.
 * Only the AI-written part is stored (no dates, no owner), so it is safe to share.
 */
import { model, Schema, type InferSchemaType } from 'mongoose';

/** One cached plan. */
const variantSchema = new Schema(
  {
    id: { type: String, required: true },
    provider: { type: String, enum: ['gemini', 'groq'], required: true },
    trip: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

/** All cached plans for one kind of trip. */
const planCacheSchema = new Schema({
  key: { type: String, required: true, unique: true },
  variants: { type: [variantSchema], default: [] },
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 },
});

/** Plain fields of a cache record. */
export type PlanCacheFields = InferSchemaType<typeof planCacheSchema>;
/** The plan_cache collection. */
export const PlanCache = model('PlanCache', planCacheSchema, 'plan_cache');
