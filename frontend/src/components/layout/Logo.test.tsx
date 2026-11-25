/**
 * Logo.test.tsx — the TripWise identity:
 *   - the logo links home, is named for screen readers and draws the gateway mark (decorative)
 *   - the mark follows the text colour (so it shows in dark mode) with a saffron sun
 *   - the footer carries the slogan, with the Hindi line marked as Hindi
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { BrandMark } from './BrandMark';
import { Footer } from './Footer';
import { Logo } from './Logo';

describe('Logo', () => {
  it('links home with a readable name and a decorative mark', () => {
    render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'TripWise home' });
    expect(link).toHaveAttribute('href', '/');
    const mark = link.querySelector('svg');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('BrandMark', () => {
  it('draws the gateway in the text colour and the sun in saffron', () => {
    const { container } = render(<BrandMark />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    paths.forEach((p) => expect(p).toHaveAttribute('fill', 'currentColor'));
    expect(container.querySelector('circle')).toHaveAttribute('fill', BRAND.colours.sun);
  });
});

describe('Footer', () => {
  it('carries the slogan, in English and Hindi', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText(BRAND.slogan)).toBeInTheDocument();
    expect(screen.getByText(BRAND.sloganHi)).toHaveAttribute('lang', 'hi');
  });
});
