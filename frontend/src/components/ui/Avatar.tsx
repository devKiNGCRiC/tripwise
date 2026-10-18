/**
 * Avatar.tsx — a traveller's round photo, or their initial on the world's colour when they
 * haven't added one. Used in the navbar, friend cards and the passport.
 */
import { cn } from '@/lib/utils/cn';

/** A round profile picture (decorative: the name is always shown next to it). */
export function Avatar({ name, url, className }: { name: string; url?: string; className?: string }) {
  return url ? (
    <img src={url} alt="" className={cn('size-10 shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display text-lg text-on-accent', className)}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
