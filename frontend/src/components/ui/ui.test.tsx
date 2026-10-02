/**
 * ui.test.tsx — behaviour tests for the shared UI primitives.
 * We test what users experience (roles, labels, states), not CSS classes.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';

describe('Button', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Plan my trip</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and busy while loading (prevents double submits)', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('Chip', () => {
  /** A tiny controlled wrapper, like a real parent component would be. */
  function ControlledChip() {
    const [selected, setSelected] = useState(false);
    return (
      <Chip selected={selected} onSelectedChange={setSelected}>
        Food
      </Chip>
    );
  }

  it('toggles aria-pressed when clicked', async () => {
    render(<ControlledChip />);
    const chip = screen.getByRole('button', { name: 'Food' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Input', () => {
  it('links its label and shows an accessible error', () => {
    render(<Input label="Email" error="Enter a valid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address');
  });

  it('shows a hint when there is no error', () => {
    render(<Input label="Password" hint="At least 8 characters" />);
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters');
  });
});
