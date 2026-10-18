/**
 * destination.ts — a place in the Explore catalogue (same shape as the frontend's
 * `Destination`). `id` is our own stable id ("d_goa"), separate from Mongo's _id, so seeds
 * and the mock stay in step.
 */
import { model, Schema, type InferSchemaType } from 'mongoose';

/** What a destination looks like in the database. */
const destinationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    localName: { type: String },
    region: { type: String, enum: ['himalaya', 'thar', 'ganga', 'deccan', 'ghats', 'konkan', 'sisters'] },
    country: { type: String, required: true },
    vibes: { type: [String], default: [] },
    budgetTier: { type: String, enum: ['budget', 'mid', 'luxury'], required: true },
    bestMonths: { type: [Number], default: [] },
    summary: { type: String, required: true },
    highlights: { type: [String], default: [] },
    avgDailyCost: { amount: { type: Number, required: true }, currency: { type: String, required: true } },
    image: { url: { type: String, required: true }, credit: String, creditUrl: String },
    /** Position in the catalogue (Explore lists places in this order). */
    order: { type: Number, default: 0 },
  },
  { versionKey: false },
);

/** Plain fields of a destination. */
export type DestinationFields = InferSchemaType<typeof destinationSchema>;
/** The destinations collection. */
export const Destination = model('Destination', destinationSchema);
