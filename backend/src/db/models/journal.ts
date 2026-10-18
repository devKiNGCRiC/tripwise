/**
 * journal.ts — a traveller's memory of one finished trip: a rating in diyas (1–5), a short
 * written memory and up to 6 photos (the photo bytes live in the photos store; here we keep
 * only their ids, sizes and alt text, in the order they were added).
 */
import { model, Schema } from 'mongoose';

/** One photo as listed in a journal. */
const journalPhotoSchema = new Schema(
  {
    id: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

/** One trip's journal. */
const journalSchema = new Schema({
  itineraryId: { type: Schema.Types.ObjectId, ref: 'Itinerary', required: true, unique: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, default: null },
  memory: { type: String, default: '', maxlength: 1000 },
  photos: { type: [journalPhotoSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

/** The journals collection. */
export const Journal = model('Journal', journalSchema);
