/**
 * potliItem.ts — one thing in a Toli's Potli (packing list):
 *   group  shared by the Toli ("first-aid kit", "speaker"); one Sahyatri claims it ("I'll bring it")
 *          and ticks it packed
 *   mine   on one person's own list — never shown to anyone else
 */
import { model, Schema } from 'mongoose';

/** One item. */
const potliItemSchema = new Schema(
  {
    toliId: { type: String, required: true, index: true },
    addedBy: { type: String, required: true },
    text: { type: String, required: true },
    /** On the adder's own private list. */
    mine: { type: Boolean, default: false },
    /** Group items: who is bringing it. */
    claimedBy: { type: String, default: null },
    packed: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);

/** The Potli collection. */
export const PotliItem = model('PotliItem', potliItemSchema);
