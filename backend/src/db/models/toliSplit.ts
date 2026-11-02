/**
 * toliSplit.ts — Dharas: a Toli splitting up, each group (Dhara) with its own name, stops and
 * people, meeting again at a Sangam (a place and a time), where everyone says "I'm here".
 *   day: n     part of that day of the Sahyatra (needs a Sangam)
 *   day: null  fixed Dharas for the whole trip (Bus 1, Section A — college and office Tolis),
 *              each with its own lead; no Sangam
 * A Sahyatri's split waits ('proposed') until a leader approves it ('active').
 */
import { model, Schema } from 'mongoose';

/** One Dhara. */
const dharaSchema = new Schema({
  name: { type: String, required: true },
  stops: { type: [String], default: [] },
  memberIds: { type: [String], default: [] },
  /** Fixed Dharas: the Sahyatri who leads this group. */
  leadId: { type: String },
});

/** Where and when the Dharas meet again. */
const sangamSchema = new Schema({ place: { type: String, required: true }, at: { type: Date, required: true } }, { _id: false });

/** One split. */
const toliSplitSchema = new Schema(
  {
    toliId: { type: String, required: true, index: true },
    day: { type: Number, default: null },
    dharas: { type: [dharaSchema], default: [] },
    sangam: { type: sangamSchema, default: null },
    /** Who has said "I'm here" at the Sangam. */
    here: { type: [String], default: [] },
    status: { type: String, enum: ['proposed', 'active'], required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);

/** The splits collection. */
export const ToliSplit = model('ToliSplit', toliSplitSchema);
