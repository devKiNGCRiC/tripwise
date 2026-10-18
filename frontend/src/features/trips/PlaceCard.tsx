/**
 * PlaceCard.tsx — stands in for a destination photo when we don't have one (the AI can plan
 * any place on Earth, but only catalogue places come with photos). Instead of an empty
 * box — or a misleading photo of somewhere else — it shows the place's name in large type
 * on a wash of the current world's colours. Fills its (relative) parent.
 */
import { cn } from '@/lib/utils/cn';

/** The name card. `label` makes it an image for screen readers; leave it out when decorative. */
export function PlaceCard({ name, label, className }: { name: string; label?: string; className?: string }) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('absolute inset-0 grid place-items-center overflow-hidden bg-linear-to-br from-accent/85 via-accent/55 to-ink/70 p-6', className)}
    >
      {/* A soft sun glow, echoing the living landscape */}
      <span aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-white/25 blur-2xl" />
      <span className="relative text-center font-display text-[clamp(40px,6vw,88px)] leading-none text-white [text-shadow:0_2px_18px_rgb(0_0_0/.35)]">
        {name}
      </span>
    </div>
  );
}
