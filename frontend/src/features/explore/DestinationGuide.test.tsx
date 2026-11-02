/**
 * DestinationGuide.test.tsx — the written guide on a destination page:
 *   - About, History, Why it matters, Things to do and Food to try, each as a heading
 *   - the sources are credited with links and the licence
 *   - no guide → nothing at all
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DestinationGuide as Guide } from '@/lib/api/types';
import { DestinationGuide } from './DestinationGuide';

/** A short guide for Gangtok. */
const guide: Guide = {
  about: 'Gangtok is the tidy hill capital of Sikkim.',
  history: 'Thutob Namgyal moved the capital here in 1894.',
  significance: 'A centre of Tibetan Buddhist learning.',
  thingsToDo: [
    { title: 'Rumtek Monastery', detail: 'Seat of the Karmapa.' },
    { title: 'MG Marg', detail: 'The car-free main street.' },
  ],
  food: [
    { name: 'Momos', detail: 'Steamed dumplings.' },
    { name: 'Thukpa', detail: 'Noodle soup.' },
  ],
  sources: [
    { title: 'Gangtok — Wikivoyage', url: 'https://en.wikivoyage.org/wiki/Gangtok', licence: 'CC BY-SA 4.0' },
    { title: 'Gangtok — Wikipedia', url: 'https://en.wikipedia.org/wiki/Gangtok', licence: 'CC BY-SA 4.0' },
  ],
  checked: '2026-11-03',
};

describe('DestinationGuide', () => {
  it('shows each part of the guide under its own heading', () => {
    render(<DestinationGuide guide={guide} name="Gangtok" />);
    for (const heading of ['About Gangtok', 'History', 'Why it matters', 'Things to do', 'Food to try']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/tidy hill capital/)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Things to do' })).getAllByRole('listitem')).toHaveLength(2);
    expect(within(screen.getByRole('list', { name: 'Food to try' })).getByText('Momos')).toBeInTheDocument();
  });

  it('credits its sources with links and the licence', () => {
    render(<DestinationGuide guide={guide} name="Gangtok" />);
    expect(screen.getByRole('link', { name: 'Gangtok — Wikivoyage' })).toHaveAttribute('href', 'https://en.wikivoyage.org/wiki/Gangtok');
    expect(screen.getByRole('link', { name: 'Gangtok — Wikipedia' })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Gangtok');
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/');
  });

  it('shows nothing when there is no guide', () => {
    const { container } = render(<DestinationGuide guide={null} name="Paris" />);
    expect(container).toBeEmptyDOMElement();
  });
});
