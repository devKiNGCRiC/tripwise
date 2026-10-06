/**
 * Bunting.test.tsx — the festival-flag divider is decoration only.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bunting } from './Bunting';

describe('Bunting', () => {
  it('is decorative', () => {
    const { container } = render(<Bunting />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
