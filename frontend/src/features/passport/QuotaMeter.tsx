/**
 * QuotaMeter.tsx — today's free AI plans: "4 of 5 AI plans left today", five little
 * segments (filled = still available) and when the allowance resets.
 */
import { useQuota } from '@/features/planner/hooks';
import { cn } from '@/lib/utils/cn';

/** Today's AI plan allowance; `compact` drops the big title (inside a titled panel). */
export function QuotaMeter({ compact = false }: { compact?: boolean }) {
  const { data: quota } = useQuota();
  if (!quota) return null;
  const left = Math.max(0, quota.limit - quota.used);
  const resets = new Date(quota.resetsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  return (
    <div>
      {!compact && <p className="font-display text-2xl">AI planner</p>}
      <p className={cn('font-semibold', !compact && 'mt-1')}>
        {left} of {quota.limit} AI plans left today
      </p>
      <div aria-hidden className="mt-3 flex gap-1.5">
        {Array.from({ length: quota.limit }, (_, i) => (
          <span key={i} className={cn('h-2 flex-1 rounded-full', i < left ? 'bg-accent' : 'bg-accent/20')} />
        ))}
      </div>
      <p className="mt-2 text-sm text-soft">Resets at {resets}. Free for everyone, every day.</p>
    </div>
  );
}
