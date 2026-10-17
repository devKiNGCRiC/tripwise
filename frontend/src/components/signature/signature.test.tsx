/**
 * signature.test.tsx — the Monsoon Editorial pieces degrade gracefully:
 * the liquid keeps its CSS gradient when WebGL is missing (jsdom has none),
 * ornaments stay hidden from screen readers, and reveals never hide content
 * where IntersectionObserver doesn't exist.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { Kolam } from './Kolam';
import { LiquidCanvas } from './LiquidCanvas';
import { Rangoli } from './Rangoli';
import { useReveal } from './useReveal';

/** Test-only section using the reveal hook like real sections do. */
function RevealSection() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref}>
      <span className="reveal-line">
        <span>Line</span>
      </span>
      <p className="reveal-up">Block</p>
    </section>
  );
}

describe('signature pieces', () => {
  it('keeps the liquid gradient fallback when WebGL is unavailable', () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ position: 'relative' }}>
          <LiquidCanvas />
        </div>
      </ThemeProvider>,
    );
    const layer = container.querySelector('.liquid-fallback');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer?.querySelector('canvas')).not.toBeNull();
  });

  it('hides decorative ornaments from screen readers', () => {
    const { container } = render(
      <>
        <Rangoli />
        <Kolam />
      </>,
    );
    container.querySelectorAll('svg').forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'));
  });

  it('reveals content immediately without IntersectionObserver', () => {
    const { container } = render(<RevealSection />);
    expect(container.querySelector('section')).toHaveClass('is-in');
    expect(container.querySelector('.reveal-line')).toHaveClass('is-in');
    expect(container.querySelector('.reveal-up')).toHaveClass('is-in');
  });
});
