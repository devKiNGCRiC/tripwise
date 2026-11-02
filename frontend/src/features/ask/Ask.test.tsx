/**
 * Ask.test.tsx — the Ask TripWise box on a trip (demo answers come from the trip and catalogue):
 *   - tapping a suggested question gets an answer with chips for real places and follow-ups
 *   - a follow-up chip asks it; the allowance left is shown; Start over clears the conversation
 *   - when today's questions are used up, the box says so
 *   - a Toli's Sahyatra has the box too
 */
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiUrl } from '@/lib/api/config';
import { session } from '@/mocks/db';
import { server } from '@/mocks/node';
import { renderApp } from '@/test/render';

/** The Ask TripWise box. */
const box = () => screen.findByRole('region', { name: 'Ask TripWise' });

describe('Ask TripWise', () => {
  beforeEach(() => session.set('u_demo'));

  it('answers a suggested question with real places and follow-ups', async () => {
    const { user } = renderApp('/trips/it_seed_kerala');
    const ask = await box();
    await user.click(await within(ask).findByRole('button', { name: 'What’s worth seeing near our stops?' }));
    const answer = await within(ask).findByRole('article', { name: 'TripWise' });
    expect(answer).toHaveTextContent(/Kerala Backwaters/);
    const chip = within(answer).getAllByRole('link')[0];
    expect(chip.getAttribute('href')).toBe('/destinations/kerala');
    expect(within(ask).getByText('19 of 20 questions left today')).toBeInTheDocument();

    await user.click(within(answer).getByRole('button', { name: 'What should I pack?' }));
    await waitFor(() => expect(within(ask).getAllByRole('article', { name: 'TripWise' })).toHaveLength(2));
    expect(within(ask).getAllByRole('article', { name: 'You' }).map((a) => a.textContent)).toEqual(['What’s worth seeing near our stops?', 'What should I pack?']);

    await user.click(within(ask).getByRole('button', { name: 'Start over' }));
    await waitFor(() => expect(within(ask).queryByRole('article', { name: 'TripWise' })).not.toBeInTheDocument());
  });

  it('lets you type a question', async () => {
    const { user } = renderApp('/trips/it_seed_kerala');
    const ask = await box();
    await user.type(within(ask).getByLabelText('Your question'), 'Where can we eat near the houseboat?');
    await user.click(within(ask).getByRole('button', { name: 'Ask' }));
    expect(await within(ask).findByRole('article', { name: 'TripWise' })).toBeInTheDocument();
    expect(within(ask).getByLabelText('Your question')).toHaveValue('');
  });

  it('says when today’s questions are used up', async () => {
    server.use(http.post(apiUrl('/itineraries/:id/ask'), () => HttpResponse.json({ error: { code: 'QUOTA_EXCEEDED', message: "You've asked today's 20 questions — more tomorrow." } }, { status: 429 })));
    const { user } = renderApp('/trips/it_seed_kerala');
    const ask = await box();
    await user.click(await within(ask).findByRole('button', { name: 'What’s worth seeing near our stops?' }));
    expect(await within(ask).findByRole('alert')).toHaveTextContent("You've asked today's 20 questions");
  });

  it('is on the Toli’s Sahyatra too', async () => {
    session.set('u_ananya');
    renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    expect(await box()).toBeInTheDocument();
  });
});
