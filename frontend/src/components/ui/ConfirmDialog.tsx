/**
 * ConfirmDialog.tsx — a small modal that asks before something can't be undone
 * ("Delete this trip?"). Focus starts on Cancel (the safe choice); Escape cancels.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

/** Ask, then confirm or cancel. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, busy = false }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Safe default focus, and Escape to back out.
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="glass-strong w-full max-w-md rounded-card p-7">
        <h2 id="confirm-title" className="text-3xl">
          {title}
        </h2>
        <div className="mt-3 text-soft">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={busy} className="bg-danger text-white">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
