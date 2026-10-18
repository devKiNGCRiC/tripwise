/**
 * itinerary.ts — a saved trip plan (same shape as the frontend's `Itinerary`), plus:
 *   - ownerId: whose trip it is (never sent to the website)
 *   - source: 'ai' (written now) or 'cache' (re-used from a similar trip)
 *   - cacheVariantId: which cached plan it is, so one traveller never gets the same twice
 *   - shareId: set once a public share link is created
 *   - region: which of India's seven worlds it's in ('abroad' outside India)
 */
import { model, Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** One activity in a day (sub-documents get no _id of their own). */
const activitySchema = new Schema(
  {
    time: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    startTime: String,
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: String,
    estCost: Number,
    transfer: {
      type: new Schema({ mode: { type: String, required: true }, minutes: { type: Number, required: true } }, { _id: false }),
      default: undefined,
    },
  },
  { _id: false },
);

/** One day of the trip. */
const daySchema = new Schema(
  {
    dayNumber: { type: Number, required: true },
    date: { type: String, required: true },
    theme: { type: String, required: true },
    activities: { type: [activitySchema], default: [] },
  },
  { _id: false },
);

/** What a saved trip looks like in the database. */
const itinerarySchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shareId: { type: String, unique: true, sparse: true },
    request: {
      destination: { type: String, required: true },
      startDate: { type: String, required: true },
      endDate: { type: String, required: true },
      budget: { amount: { type: Number, required: true }, currency: { type: String, required: true } },
      travellers: { type: String, required: true },
      interests: { type: [String], default: [] },
      pace: { type: String, required: true },
    },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    days: { type: [daySchema], default: [] },
    estimatedCost: {
      total: { type: Number, required: true },
      breakdown: {
        stay: { type: Number, required: true },
        food: { type: Number, required: true },
        transport: { type: Number, required: true },
        activities: { type: Number, required: true },
      },
      currency: { type: String, required: true },
    },
    tips: { type: [String], default: [] },
    packingList: { type: [String], default: [] },
    provider: { type: String, enum: ['gemini', 'groq'], required: true },
    source: { type: String, enum: ['ai', 'cache'], default: 'ai' },
    /** Which of the seven worlds (or 'abroad'); null when unknown. Lights worlds on the passport. */
    region: { type: String, default: null },
    cacheVariantId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// A traveller's trips are listed newest first.
itinerarySchema.index({ ownerId: 1, createdAt: -1 });

/** Plain fields of a trip. */
export type ItineraryFields = InferSchemaType<typeof itinerarySchema>;
/** A trip loaded from the database. */
export type ItineraryDoc = HydratedDocument<ItineraryFields>;
/** The itineraries collection. */
export const Itinerary = model('Itinerary', itinerarySchema);
