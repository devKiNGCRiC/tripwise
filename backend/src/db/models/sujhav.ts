/**
 * sujhav.ts — a suggested change to a Toli's Sahyatra (add, remove, swap or move a stop,
 * retheme or add a day, change transport — see services/toliRules.ts `SujhavChange`), the
 * Sahyatris' votes on it (+1 / −1 by user id), and what the leaders decided.
 */
import { model, Schema } from 'mongoose';

/** One suggestion. */
const sujhavSchema = new Schema(
  {
    toliId: { type: String, required: true },
    authorId: { type: String, required: true },
    change: { type: Schema.Types.Mixed, required: true },
    note: { type: String },
    votes: { type: Map, of: Number, default: () => new Map() },
    status: { type: String, enum: ['open', 'approved', 'declined'], default: 'open' },
    decidedBy: { type: String },
    decidedAt: { type: Date },
    reason: { type: String },
  },
  { timestamps: true, versionKey: false },
);
// A Toli's suggestions, newest first.
sujhavSchema.index({ toliId: 1, createdAt: -1 });

/** The suggestions collection. */
export const Sujhav = model('Sujhav', sujhavSchema);
