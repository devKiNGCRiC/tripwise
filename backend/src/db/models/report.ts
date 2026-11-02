/**
 * report.ts — someone reporting a public passport (spam, offensive, pretending to be someone),
 * and what an admin decided: dismissed, or actioned (content removed, or the account blocked).
 */
import { model, Schema } from 'mongoose';

/** Why a passport was reported. */
export const REPORT_REASONS = ['spam', 'offensive', 'impersonation', 'other'] as const;

/** One report. */
const reportSchema = new Schema(
  {
    reporterId: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String },
    status: { type: String, enum: ['open', 'dismissed', 'actioned'], default: 'open' },
    /** What the admin did: dismiss, remove-content or block. */
    action: { type: String },
    decidedBy: { type: String },
    decidedAt: { type: Date },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);

/** The reports collection. */
export const Report = model('Report', reportSchema);
