/**
 * anurodh.ts — a raised hand in a Toli's chat: a Sahyatri in announcement mode asks to speak
 * and says what it's about. Leaders allow one message, a time window ('30m', '1h', 'trip'),
 * answer privately (`reply`, seen only by the asker), or decline.
 */
import { model, Schema } from 'mongoose';

/** One request. */
const anurodhSchema = new Schema(
  {
    toliId: { type: String, required: true },
    userId: { type: String, required: true },
    about: { type: String, required: true },
    status: { type: String, enum: ['open', 'granted', 'declined', 'answered'], default: 'open' },
    grant: { type: String, enum: ['one', '30m', '1h', 'trip'] },
    reply: { type: String },
    decidedBy: { type: String },
    decidedAt: { type: Date },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// A Toli's open requests; a person's latest.
anurodhSchema.index({ toliId: 1, status: 1, createdAt: 1 });
anurodhSchema.index({ toliId: 1, userId: 1, createdAt: -1 });

/** The raise-hand requests collection. */
export const Anurodh = model('Anurodh', anurodhSchema);
