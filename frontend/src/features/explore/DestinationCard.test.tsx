/**
 * DestinationCard.test.tsx — accessibility of the destination postcard:
 * the link is named by the place first, Hindi text is marked as Hindi, and
 * red tags use the darker red so white text stays readable.
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
  });

  it('marks the Hindi name as Hindi so screen readers pronounce it', () => {
    renderCard();
    expect(screen.getByText('गोवा').closest('[lang="hi"]')).not.toBeNull();
  });

  it('uses the darker red behind white text on red tags', () => {
    renderCard({ ...goa, vibes: ['party'] });
    const tag = screen.getByText('party');
    expect(tag.className).toContain('bg-danger');
    expect(tag.className).not.toMatch(/\bbg-red\b/);
  });
});
