/**
 * Card.tsx — content container.
 *   glass → strong frosted panel (default; floats over the living world)
 *   solid → lighter frosted panel with a hairline (secondary content, lists)
 */
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export type CardVariant = 'glass' | 'solid';

const VARIANTS: Record<CardVariant, string> = {
  glass: 'glass-strong',
  solid: 'glass',
};

export interface CardProps extends ComponentProps<'div'> {
  variant?: CardVariant;
}

export function Card({ variant = 'glass', className, ...rest }: CardProps) {
  return <div className={cn('rounded-card', VARIANTS[variant], className)} {...rest} />;
}
