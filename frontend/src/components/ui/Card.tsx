/**
 * Card.tsx — content container.
 *   glass → frosted translucent panel (default; floats over the liquid colour)
 *   solid → quiet sand/indigo surface with a hairline (dense content, lists)
 */
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export type CardVariant = 'glass' | 'solid';

const VARIANTS: Record<CardVariant, string> = {
  glass: 'glass-strong',
  solid: 'border border-line bg-paper-2',
};

export interface CardProps extends ComponentProps<'div'> {
  variant?: CardVariant;
}

export function Card({ variant = 'glass', className, ...rest }: CardProps) {
  return <div className={cn('rounded-card', VARIANTS[variant], className)} {...rest} />;
}
