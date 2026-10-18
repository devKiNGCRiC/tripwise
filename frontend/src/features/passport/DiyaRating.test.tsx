/**
 * DiyaRating.test.tsx — rating a trip by lighting 1 to 5 diyas, with the keyboard too, and
 * a read-only version for showing a rating.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DiyaRating } from './DiyaRating';

/** A rating the test can change. */
function Harness() {
  const [value, setValue] = useState<number | null>(2);
  return <DiyaRating value={value} onChange={setValue} label="Rating" />;
}

describe('DiyaRating', () => {
  it('lights diyas by click and arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('radio', { name: '2 diyas' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '5 diyas' }));
    expect(screen.getByRole('radio', { name: '5 diyas' })).toBeChecked();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: '4 diyas' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1 diya' })).toBeInTheDocument();
  });

  it('can just show a rating', () => {
    render(<DiyaRating value={3} label="Rating" />);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByRole('img', { name: '3 of 5 diyas' })).toBeInTheDocument();
  });
});
