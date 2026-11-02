/**
 * ask.test.ts — Ask TripWise through the API client, served by the demo mock (which answers from
 * the trip and the catalogue without any AI): an answer with chips for real catalogue places, a
 * kept conversation that can be cleared, a daily allowance, and 404 for other people's trips.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { api } from './client';
import { askApi } from './endpoints';

/** Log in as someone (mock session). */
async function loginAs(userId: string) {
  session.set(userId);
  await api.refreshSession();
}

/** Demo's Kerala trip (also the Kerala Toli's Sahyatra). */
const KERALA = 'it_seed_kerala';

describe('Ask TripWise (demo mock)', () => {
  beforeEach(() => loginAs('u_demo'));

  it('answers with real places nearby and keeps the conversation', async () => {
    const { reply, quota } = await askApi.ask(KERALA, 'What is near our stops?');
    expect(reply.role).toBe('assistant');
    expect(reply.text.length).toBeGreaterThan(20);
    expect(reply.places?.length).toBeGreaterThan(0);
    expect(reply.places![0]).toMatchObject({ id: expect.stringMatching(/^p_/), destination: expect.any(String) });
    expect(reply.followUps?.length).toBeGreaterThan(0);
    expect(quota).toMatchObject({ used: 1, limit: 20 });
    const { messages } = await askApi.history(KERALA);
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    await askApi.clear(KERALA);
    expect((await askApi.history(KERALA)).messages).toEqual([]);
  });

  it('lets a Sahyatri ask about the Sahyatra, but not strangers', async () => {
    await loginAs('u_ananya');
    expect((await askApi.ask(KERALA, 'Best time for photos?')).reply.role).toBe('assistant');
    await loginAs('u_meera');
    await expect(askApi.ask(KERALA, 'Hello?')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuses the 21st question of the day', async () => {
    for (let i = 0; i < 20; i++) await askApi.ask(KERALA, `Q${i}`);
    await expect(askApi.ask(KERALA, 'One more?')).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });
});
