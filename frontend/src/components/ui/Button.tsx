/**
 * Button.tsx — the TripWise button in four flavours:
 *   primary   → solid ink (Day) / gold (Night) pill — the main call to action
 *   secondary → frosted glass pill with a hairline edge
 *   ghost     → text only, soft tint on hover (low-emphasis actions)
 *   glow      → gold-to-teal gradient with a halo — reserved for AI actions like "Generate"
 * `buttonClasses()` is exported so <Link>s can look exactly like buttons.
 */
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glow';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Shared look: pill shape, semibold body font, gentle lift on hover, dimmed when disabled. */
const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border font-semibold select-none transition duration-300 ease-out-expo hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60';

/** Per-variant colours (all from design tokens). */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-cta text-on-cta shadow-[0_14px_30px_-14px_rgb(0_0_0/.5)] hover:shadow-[0_18px_34px_-14px_rgb(0_0_0/.55)]',
  secondary: 'glass border-line text-ink',
  ghost: 'border-transparent bg-transparent text-ink hover:translate-y-0 hover:bg-ink/6',
  glow: 'border-transparent bg-[linear-gradient(120deg,#e6b765,#f29e40_45%,#6fd3d0)] text-[#1c1814] shadow-[0_10px_40px_-8px_rgb(230_183_101/.7)] hover:brightness-105',
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
