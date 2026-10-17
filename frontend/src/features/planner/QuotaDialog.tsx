/**
 * QuotaDialog.tsx — shown when today's 5 free AI plans are used up: says when they reset
 * (from the quota endpoint; local midnight if it can't be read) and closes back to the
 * planner with every answer intact. A modal: focus moves to OK, Escape closes it.
 */
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useQuota } from './hooks';

/** The "daily limit reached" dialog. */
export function QuotaDialog({ onClose }: { onClose: () => void }) {
  const { data: quota } = useQuota();
  const okRef = useRef<HTMLButtonElement>(null);
  const resets = quota ? new Date(quota.resetsAt) : null;
  const when = resets ? resets.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'midnight';

  // Focus the button, and close on Escape.
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="quota-title" className="glass-strong w-full max-w-md rounded-card p-7 text-center">
        <h2 id="quota-title" className="text-3xl">
          You've planned 5 trips today
        </h2>
        <p className="mt-3 text-soft">Free AI plans are limited to 5 a day so everyone gets a turn. Your allowance resets at {when}, and your answers are saved here.</p>
        <Button ref={okRef} className="mt-6" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}
