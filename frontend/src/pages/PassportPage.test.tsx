/**
 * PassportPage.test.tsx — the scenery setting: travellers can force photos
 * (lighter, saves data) or 3D, or let TripWise decide; the choice is remembered.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { readScenePreference } from '@/scene/scenePreference';
import { renderApp } from '@/test/render';

describe('PassportPage scenery setting', () => {
  it('starts on Automatic and remembers a new choice', async () => {
    session.set('u_demo');
    const { user } = renderApp('/passport');
    const automatic = await screen.findByRole('radio', { name: /automatic/i });
    expect(automatic).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /photos/i }));
    expect(readScenePreference()).toBe('photo');

    await user.click(screen.getByRole('radio', { name: /automatic/i }));
    expect(readScenePreference()).toBeNull();
  });
});
