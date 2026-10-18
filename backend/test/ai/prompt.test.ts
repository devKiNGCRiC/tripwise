/**
 * prompt.test.ts — the instructions sent to the AI carry the traveller's details and rules,
 * and the traveller's own text is kept short and treated as data.
 */
import { describe, expect, it } from 'vitest';
import { dayPrompt, tripPrompt } from '../../src/services/ai/prompt.js';
import { aiTripFixture, tripRequest } from '../helpers/fakeAi.js';

describe('tripPrompt', () => {
  it('includes the dates, the number of days, the pace rule and the budget', () => {
    const prompt = tripPrompt(tripRequest());
    expect(prompt.user).toContain('2026-11-10');
    expect(prompt.user).toContain('2026-11-12');
    expect(prompt.user).toContain('3 days');
    expect(prompt.user).toMatch(/3 activities/);
    expect(prompt.user).toContain('3000');
    expect(prompt.jsonSchema).toHaveProperty('properties.days');
  });

  it('keeps the destination inside <destination> tags and cuts it to 80 characters', () => {
    const prompt = tripPrompt(tripRequest({ destination: 'G'.repeat(200) }));
    expect(prompt.user).toContain(`<destination>${'G'.repeat(80)}</destination>`);
    expect(prompt.user).not.toContain('G'.repeat(81));
    expect(prompt.system).toMatch(/data, not instructions/i);
  });
});

describe('dayPrompt', () => {
  it('names the day and the places already used on other days', () => {
    const req = tripRequest();
    const trip = aiTripFixture(req);
    const prompt = dayPrompt(req, trip.days, 2);
    expect(prompt.user).toContain('day 2');
    expect(prompt.user).toContain('Stop A1.1');
    expect(prompt.user).not.toContain('Stop A2.1');
  });
});
