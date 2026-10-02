/**
 * Toast.test.tsx — toasts appear in a live region and can be dismissed.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './Toast';

/** Test-only button that fires a toast through the hook, like real components do. */
function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show({ title: 'Trip saved!', tone: 'success' })}>
      fire
    </button>
  );
}

describe('Toast', () => {
  it('shows a toast and removes it when dismissed', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(await screen.findByText('Trip saved!')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(screen.queryByText('Trip saved!')).not.toBeInTheDocument());
  });
});
