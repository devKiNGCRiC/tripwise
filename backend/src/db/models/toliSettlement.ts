/**
 * toliSettlement.ts — money paid back between two Sahyatris (by UPI or cash), recorded by any
 * member. Settlements are never deleted: a mistake is fixed by recording the reverse payment, so
 * the Lekha always shows what really happened. `clientId` makes an offline retry count once.
 */
import { model, Schema } from 'mongoose';

/** One payment back. */
const toliSettlementSchema = new Schema(
  {
    toliId: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    /** Paise. */
    amount: { type: Number, required: true },
    method: { type: String, enum: ['upi', 'cash'], required: true },
    recordedBy: { type: String, required: true },
    clientId: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// One settlement per phone-made id; the Toli's list, newest first.
toliSettlementSchema.index({ toliId: 1, recordedBy: 1, clientId: 1 }, { unique: true });
toliSettlementSchema.index({ toliId: 1, createdAt: -1 });

/** The settlements collection. */
export const ToliSettlement = model('ToliSettlement', toliSettlementSchema);
