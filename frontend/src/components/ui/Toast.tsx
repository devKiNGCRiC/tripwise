/**
 * Toast.tsx — small pop-up notifications ("Trip saved!", "Welcome back").
 *
 * <ToastProvider> renders a fixed live region; screen readers announce new toasts.
 * Any component calls `useToast().show({...})`. Toasts auto-dismiss after a few
 * seconds, can be closed manually, and at most 3 are visible at once.
 * On phones they sit above the bottom tab bar; on desktop, bottom-right.
 */
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** How long before it closes itself. Default 4000ms. */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Icon + accent colour for each tone. */
const TONES: Record<ToastTone, { icon: typeof Info; accent: string }> = {
  success: { icon: CircleCheck, accent: 'bg-green-deep' },
  error: { icon: CircleAlert, accent: 'bg-danger' },
  info: { icon: Info, accent: 'bg-sky' },
};

/** Ever-increasing id so React can track each toast. */
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /** Remove one toast by id. */
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  /** Add a toast (keeping only the newest 3) and schedule its auto-dismiss. */
  const show = useCallback(
    ({ title, description, tone = 'info', durationMs = 4000 }: ToastInput) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-2), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      {/* Live region: polite = announced after the user's current action, not interrupting it. */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, accent } = TONES[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, rotate: -2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 border-line bg-surface p-3 pr-2 shadow-pop"
              >
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-white', accent)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold">{toast.title}</p>
                  {toast.description && <p className="text-sm text-ink-soft">{toast.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="grid size-8 place-items-center rounded-full hover:bg-ink/5 focus-visible:outline-3 focus-visible:outline-sky-deep"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

/** Show or dismiss toasts from any component inside <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
