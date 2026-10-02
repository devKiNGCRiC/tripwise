/**
 * Ticket.tsx — the boarding-pass card: main body, a perforated line, and a
 * 72px "stub" at the bottom, with half-circle notches cut at the perforation.
 *
 * The notches come from the `ticket-notch` CSS mask (index.css). Masks clip
 * box-shadows, so the outer wrapper uses a drop-shadow filter instead —
 * it follows the notched shape.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface TicketProps {
  children: ReactNode;
  /** Content of the tear-off stub (one line: codes, price, CTA). */
  stub: ReactNode;
  className?: string;
}

export function Ticket({ children, stub, className }: TicketProps) {
  return (
    <div className={cn('drop-shadow-pop', className)}>
      <div className="ticket-notch overflow-hidden rounded-card border-2 border-line bg-surface">
        <div className="p-5">{children}</div>
        {/* Perforation + stub: exactly 72px tall to line up with the notches. */}
        <div className="mx-5 border-t-2 border-dashed border-line/40" />
        <div className="flex h-[70px] items-center justify-between gap-3 px-5">{stub}</div>
      </div>
    </div>
  );
}
