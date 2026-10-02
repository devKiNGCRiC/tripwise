/**
 * cn.ts — joins CSS class names, skipping falsy values.
 * Lets components write: cn('base', isActive && 'active', className)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
