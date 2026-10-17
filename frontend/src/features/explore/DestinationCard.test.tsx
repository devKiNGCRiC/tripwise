/**
 * DestinationCard.test.tsx — accessibility of the cinematic destination card:
 * the link is named by the place first, Hindi text is marked as Hindi, and places
 * without a Hindi name show their country instead.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { seedDestinations } from '@/mocks/data/destinations';
import { DestinationCard } from './DestinationCard';

const goa = seedDestinations.find((d) => d.slug === 'goa')!;

function renderCard(destination = goa) {
  return render(
    <MemoryRouter>
      <DestinationCard destination={destination} />
    </MemoryRouter>,
  );
}

describe('DestinationCard', () => {
  it('names the link by the place first, then country and price', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAccessibleName(/^Goa, India, from ₹3,500 a day/);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/destinations/goa');
  });

  it('marks the Hindi name as Hindi so screen readers pronounce it', () => {
    renderCard();
    expect(screen.getByText('गोवा')).toHaveAttribute('lang', 'hi');
  });

  it('falls back to the country when there is no Hindi name', () => {
    renderCard({ ...goa, localName: undefined, country: 'Indonesia' });
    const country = screen.getByText('Indonesia');
    expect(country).not.toHaveAttribute('lang');
  });
});
