/**
 * toliExpense.ts — one expense in a Toli's Lekha (amounts in whole paise):
 *   group     paid by one member, split among the members who shared it (`parts`)
 *   personal  the owner's own spending, seen only by them (`parts` = { owner: amount })
 * Deleting only marks it deleted (who and when), so money never silently disappears.
 * `clientId` is made on the phone, so an expense re-sent after an offline retry is stored once.
 */
import { model, Schema } from 'mongoose';
import { CATEGORIES } from '../../services/lekhaRules.js';

/** One expense. */
const toliExpenseSchema = new Schema(
  {
    toliId: { type: String, required: true },
    /** Who wrote it down (for personal ones, also the owner). */
    addedBy: { type: String, required: true },
    clientId: { type: String, required: true },
    personal: { type: Boolean, default: false },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    method: { type: String, enum: ['upi', 'cash'], required: true },
    /** Which day of the Sahyatra (1 = first), when given. */
    day: { type: Number },
    paidBy: { type: String, required: true },
    /** userId → paise; adds up to `amount` exactly. */
    parts: { type: Map, of: Number, required: true },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// One expense per phone-made id (offline retries); the Toli's list, newest first.
toliExpenseSchema.index({ toliId: 1, addedBy: 1, clientId: 1 }, { unique: true });
toliExpenseSchema.index({ toliId: 1, createdAt: -1 });

/** The expenses collection. */
export const ToliExpense = model('ToliExpense', toliExpenseSchema);
