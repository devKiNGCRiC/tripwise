/**
 * ReportPassport.tsx — "Report" on someone else's public passport: why (spam, offensive,
 * pretending to be someone, other) and an optional note. An admin looks at it; the person is
 * never told who reported them.
 */
import { useState, type FormEvent } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { reportsApi } from '@/lib/api/endpoints';
import type { ReportReason } from '@/lib/api/types';

/** The reasons, in words. */
const REASONS: [ReportReason, string][] = [
  ['spam', 'Spam or selling'],
  ['offensive', 'Offensive'],
  ['impersonation', 'Pretending to be someone'],
  ['other', 'Something else'],
];
/** Field styles. */
const FIELD = 'w-full rounded-2xl border border-line bg-white/70 px-4 py-2.5 outline-none focus:border-accent dark:bg-white/5';

/** The Report button and its dialog. */
export function ReportPassport({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /** Send the report. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await reportsApi.report(username, reason, note.trim() || undefined);
      setSent(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send that.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <p className="text-sm text-white/90">Thanks — an admin will look at it.</p>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
        <Flag aria-hidden className="size-4" /> Report
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form role="dialog" aria-modal="true" aria-label="Report this passport" onSubmit={(e) => void onSubmit(e)} className="glass-strong grid w-full max-w-md gap-3 rounded-card p-6 text-ink">
            <h2 className="text-2xl">Report this passport</h2>
            <p className="text-sm text-soft">An admin will look at it. They won’t be told who reported them.</p>
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Why?</span>
              <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} className={`${FIELD} h-11 py-0`}>
                {REASONS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Anything else (optional)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} className={FIELD} />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Send report
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
