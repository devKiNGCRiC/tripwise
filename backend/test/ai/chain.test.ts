/**
 * chain.test.ts — the fallback chain: try models in order, move on when one is slow,
 * broken or wrong, and give a friendly "busy" error only when all of them fail.
 */
import { describe, expect, it, vi } from 'vitest';
import { createAiChain, type AttemptLog } from '../../src/services/ai/chain.js';
import { tripPrompt } from '../../src/services/ai/prompt.js';
import { parseTrip } from '../../src/services/ai/validate.js';
import { AppError } from '../../src/lib/errors.js';
import { aiTripFixture, fakeProvider, tripRequest } from '../helpers/fakeAi.js';

const req = tripRequest();
const good = { text: JSON.stringify(aiTripFixture(req)), chunks: 5 };
const prompt = tripPrompt(req);
const parse = (text: string) => parseTrip(text, req);

describe('AI fallback chain', () => {
  it('moves on from a model that takes too long', async () => {
    const logs: AttemptLog[] = [];
    const slow = fakeProvider('gemini', ['timeout']);
    const backup = fakeProvider('groq', [good]);
    const chain = createAiChain([slow, backup], { timeoutMs: 300, log: (entry) => logs.push(entry) });
    const result = await chain.run(prompt, parse);
    expect(result.provider).toBe('groq');
    expect(result.value.days).toHaveLength(3);
    expect(logs.map((l) => l.outcome)).toEqual(['timeout', 'ok']);
    expect(slow.signals[0].aborted).toBe(true);
  });

  it('lets a model that keeps writing run past the timeout (long trips), but not forever', async () => {
    // 20 pieces ~15 ms apart ≈ 300 ms in total, never silent for 120 ms.
    const steady = fakeProvider('gemini', [{ text: good.text, chunks: 20 }]);
    const chain = createAiChain([steady], { timeoutMs: 120, maxMs: 5000, log: () => {} });
    expect((await chain.run(prompt, parse)).provider).toBe('gemini');

    const capped = createAiChain([fakeProvider('gemini', [{ text: good.text, chunks: 20 }])], { timeoutMs: 120, maxMs: 60, log: () => {} });
    await expect(capped.run(prompt, parse)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
  });

  it('moves on from an invalid answer and tells the stream to start over', async () => {
    const onReset = vi.fn();
    const onText = vi.fn();
    const chain = createAiChain([fakeProvider('gemini', [{ text: '{"title": "oops"}' }]), fakeProvider('groq', [good])], { timeoutMs: 200, log: () => {} });
    const result = await chain.run(prompt, parse, { onReset, onText });
    expect(result.provider).toBe('groq');
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalled();
  });

  it('does not reset when a model failed before sending anything', async () => {
    const onReset = vi.fn();
    const chain = createAiChain([fakeProvider('gemini', ['error']), fakeProvider('groq', [good])], { timeoutMs: 200, log: () => {} });
    await chain.run(prompt, parse, { onReset });
    expect(onReset).not.toHaveBeenCalled();
  });

  it('says the planners are busy when every model fails', async () => {
    const chain = createAiChain([fakeProvider('gemini', ['error']), fakeProvider('groq', [{ partial: '{"ti' }])], { timeoutMs: 200, log: () => {} });
    const error = await chain.run(prompt, parse).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(503);
    expect((error as AppError).code).toBe('AI_UNAVAILABLE');
  });

  it('stops at once when the traveller leaves (no further models tried)', async () => {
    const controller = new AbortController();
    const first = fakeProvider('gemini', ['timeout']);
    const second = fakeProvider('groq', [good]);
    const chain = createAiChain([first, second], { timeoutMs: 5000, log: () => {} });
    const running = chain.run(prompt, parse, { signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    await expect(running).rejects.toThrow();
    expect(first.signals[0].aborted).toBe(true);
    expect(second.calls).toBe(0);
  });
});
