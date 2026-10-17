/**
 * Input.tsx — labelled text input with hint and error support.
 *
 * Accessibility built in: the <label> is linked by id, errors set aria-invalid,
 * and the hint/error text is announced via aria-describedby.
 * Works with React Hook Form's `register()` because React 19 passes `ref`
 * through as a normal prop (it ends up on the <input> via ...rest).
 */
import { useId, type ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends ComponentProps<'input'> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...rest }: InputProps) {
  // Generate a stable unique id if the caller didn't give one.
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  // Errors win over hints: only one helper message is shown at a time.
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          // Soft field on glass; focus brings a teal edge and halo instead of the default outline.
          'h-12 rounded-2xl border bg-paper/60 px-4 text-base text-ink transition duration-300 outline-none placeholder:text-ink-soft/70',
          'focus:border-accent focus:bg-paper/90 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--trip-accent)_18%,transparent)]',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
      {message && (
        <p id={messageId} className={cn('text-sm', error ? 'font-medium text-danger' : 'text-ink-soft')}>
          {message}
        </p>
      )}
    </div>
  );
}
