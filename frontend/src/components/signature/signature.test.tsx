/**
 * signature.test.tsx — scroll reveals never hide content where IntersectionObserver
 * doesn't exist (old browsers, the test DOM): everything is revealed immediately.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useReveal } from './useReveal';

/** Test-only section using the reveal hook like real sections do. */
function RevealSection() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref}>
      <p className="reveal-up">Block</p>
    </section>
  );
}

describe('useReveal', () => {
  it('reveals content immediately without IntersectionObserver', () => {
    const { container } = render(<RevealSection />);
    expect(container.querySelector('section')).toHaveClass('is-in');
    expect(container.querySelector('.reveal-up')).toHaveClass('is-in');
  });
});
