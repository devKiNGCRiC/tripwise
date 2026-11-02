/**
 * adminAction.ts — the audit log: every change an admin makes (who, what, to whom, when), so
 * admin power is always visible to the other admins.
 */
import { model, Schema } from 'mongoose';

/** One admin action. */
const adminActionSchema = new Schema(
  {
    adminId: { type: String, required: true },
    /** e.g. "block", "unblock", "plan", "hide", "show", "report" */
    action: { type: String, required: true },
    targetType: { type: String, enum: ['user', 'destination', 'report'], required: true },
    targetId: { type: String, required: true },
    /** The target's name when the action happened (it may change or be deleted later). */
    target: { type: String, required: true },
    /** A short note, e.g. "blocked", "premium", "hidden from Explore". */
    detail: { type: String, default: '' },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);
adminActionSchema.index({ at: -1 });

/** The audit log collection. */
export const AdminAction = model('AdminAction', adminActionSchema);
