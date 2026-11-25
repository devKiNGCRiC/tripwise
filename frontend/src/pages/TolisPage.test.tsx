/**
 * TolisPage.test.tsx — the Tolis page for someone with none yet: it explains what a Toli does
 * (decide together, one shared plan, fair money) beside the form to start one.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('TolisPage, with no Tolis yet', () => {
  it('explains what a Toli does, next to starting one', async () => {
    session.set('u_dev');
    renderApp('/tolis');
    const intro = await screen.findByRole('region', { name: 'What a Toli does' });
    expect(within(intro).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('textbox', { name: /Toli name/i })).toBeInTheDocument();
  });
});
