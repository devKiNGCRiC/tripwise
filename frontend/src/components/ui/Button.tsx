/**
 * Button.tsx — the TripWise button in four flavours:
 *   primary   → saffron-to-orange gradient, outlined, hard shadow (main call-to-action)
 *   secondary → white card face, outlined, hard shadow
 *   ghost     → no border/shadow (low-emphasis actions)
 *   glow      → aurora gradient + glow (reserved for AI actions like "Generate")
 * `buttonClasses()` is exported so <Link>s can look exactly like buttons.
 */
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glow';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Shared look: pill shape, display font, accessible focus ring, dimmed when disabled. */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full border-2 font-display font-bold tracking-tight select-none transition disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-deep';

/** Per-variant colours and effects (all from design tokens). */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'brand-fill text-on-accent border-line shadow-pop pop-press',
  secondary: 'bg-surface text-ink border-line shadow-pop pop-press',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-ink/5',
  glow: 'aurora-fill text-black border-line shadow-glow hover:brightness-110',
};

/** Heights are ≥ 36px so buttons stay comfortable touch targets on phones. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-14 px-7 text-lg',
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Builds the class string for a button-looking element (used by Button and by links). */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className }: ButtonStyleOptions = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner and disables the button (prevents double submits). */
  loading?: boolean;
  /** Optional leading icon (hidden while loading). */
  icon?: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
