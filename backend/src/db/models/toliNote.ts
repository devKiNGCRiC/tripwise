/**
 * toliNote.ts — a note the Toli keeps: for the whole trip ("Homestay owner: Ramesh") or for one
 * day ("Carry permits"). Every member sees them; the author or a leader can change them.
 */
import { model, Schema } from 'mongoose';

/** One note. */
const toliNoteSchema = new Schema(
  {
    toliId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    /** A day of the Sahyatra (1 = first), or null for the whole trip. */
    day: { type: Number, default: null },
    text: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

/** The notes collection. */
export const ToliNote = model('ToliNote', toliNoteSchema);
