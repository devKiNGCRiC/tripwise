/**
 * kushal.ts — Kushal, the family check-in ("सब कुशल मंगल?"), for Toli and solo trips alike:
 *   KushalContact  someone at home (name only) with a private, revocable link — no account needed
 *   KushalCheckIn  the traveller's latest check-in only (no history): the nearest place's name,
 *                  a position rounded to about 1 km, the time and an optional note
 */
import { model, Schema } from 'mongoose';

/** A family contact and their link's secret. */
const kushalContactSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);

/** The latest check-in (one per traveller). */
const kushalCheckInSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    /** "near Fort Kochi beach", or why there's no place. */
    place: { type: String, required: true },
    /** Rounded to 2 decimals (about 1 km), when a position was shared. */
    lat: { type: Number },
    lon: { type: Number },
    note: { type: String },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);

/** The collections. */
export const KushalContact = model('KushalContact', kushalContactSchema);
export const KushalCheckIn = model('KushalCheckIn', kushalCheckInSchema);
