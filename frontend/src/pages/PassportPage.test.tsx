/**
 * PassportPage.test.tsx — the passport shows the traveller's details, and the
 * Motion setting: travellers can choose Calm (everything holds still) or Full;
 * the choice is remembered and applied to the page.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { MOTION_STORAGE_KEY } from '@/lib/motionPreference';
import { renderApp } from '@/test/render';

describe('PassportPage', () => {
  it("shows the traveller's details on the cover", async () => {
    session.set('u_demo');
    renderApp('/passport');
    const cover = await screen.findByRole('region', { name: 'Passport cover' });
    expect(within(cover).getByText('demo@tripwise.app')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No stamps yet' })).toBeInTheDocument();
  });

  it('starts on Full motion and remembers Calm', async () => {
    session.set('u_demo');
    const { user } = renderApp('/passport');
    expect(await screen.findByRole('radio', { name: /full/i })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /calm/i }));
    expect(screen.getByRole('radio', { name: /calm/i })).toBeChecked();
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('calm');
    expect(document.documentElement.dataset.motion).toBe('calm');

    await user.click(screen.getByRole('radio', { name: /full/i }));
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
  });
});
