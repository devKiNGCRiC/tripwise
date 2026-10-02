/**
 * Card.tsx — content container.
 *   paper → white card face with ink outline + hard shadow (default content look)
 *   glass → frosted translucent panel with glow (AI moments, night-flight vibes)
 */
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export type CardVariant = 'paper' | 'glass';

const VARIANTS: Record<CardVariant, string> = {
  paper: 'border-2 border-line bg-surface shadow-pop',
  glass: 'border border-white/25 bg-white/10 shadow-glow backdrop-blur-xl',
};

export interface CardProps extends ComponentProps<'div'> {
  variant?: CardVariant;
}

export function Card({ variant = 'paper', className, ...rest }: CardProps) {
  return <div className={cn('rounded-card', VARIANTS[variant], className)} {...rest} />;
}
