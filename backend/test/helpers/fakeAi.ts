/**
 * fakeAi.ts — stand-ins for the AI so tests never call Gemini or Groq.
 *
 *   fakeProvider('gemini', [step, step, …])  a provider that follows a script, one step per call:
 *       'timeout'                 hangs until it is cancelled
 *       'error'                   fails straight away (like a quota or network error)
 *       { text, chunks? }         sends `text`, split into `chunks` pieces
 *       { partial }               sends some text, then fails (a model dying mid-answer)
 *   fakeAiChain(...providers)    the real fallback chain over fake providers
 *   aiTripFixture(request)       a valid AI answer for any trip request
 *   fakeChain()                  a chain that must not be used in that test
 */
import type { AiChain, AiProvider } from '../../src/services/ai/chain.js';
import { createAiChain } from '../../src/services/ai/chain.js';
import { dayJsonSchema, type AiDay, type AiTrip } from '../../src/services/ai/schema.js';
import { aiUnavailable } from '../../src/lib/errors.js';
import { tripDates } from '../../src/lib/dates.js';
import type { Pace, TripRequest } from '../../src/types/api.js';

/** One scripted behaviour of a fake provider. */
export type FakeStep = 'timeout' | 'error' | { text: string; chunks?: number } | { partial: string };

/** A fake provider, plus what happened to it (for assertions). */
export interface FakeProvider extends AiProvider {
  calls: number;
  signals: AbortSignal[];
}

/** Wait until a signal is cancelled. */
const untilAborted = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    if (signal.aborted) reject(new Error('aborted'));
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });

/** Split text into n roughly equal pieces. */
function split(text: string, n: number): string[] {
  const size = Math.max(1, Math.ceil(text.length / n));
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

/** A provider that follows a script (the last step repeats once the script runs out). */
export function fakeProvider(name: 'gemini' | 'groq', script: FakeStep[], model = `${name}-fake`): FakeProvider {
  const provider: FakeProvider = {
    name,
    model,
    calls: 0,
    signals: [],
    async *stream(_prompt, signal) {
      const step = script[Math.min(provider.calls, script.length - 1)];
      provider.calls += 1;
      provider.signals.push(signal);
      if (step === 'timeout') await untilAborted(signal);
      if (step === 'error') throw new Error('fake provider error');
      if (typeof step === 'object' && 'partial' in step) {
        yield step.partial;
        throw new Error('fake provider died mid-answer');
      }
      if (typeof step === 'object' && 'text' in step) {
        for (const piece of split(step.text, step.chunks ?? 1)) {
          // A tiny pause between pieces, like a real stream.
          await new Promise((resolve) => setTimeout(resolve, 1));
          if (signal.aborted) throw new Error('aborted');
          yield piece;
        }
      }
    },
  };
  return provider;
}

/** The real fallback chain over fake providers, with a short timeout. */
export function fakeAiChain(...providers: AiProvider[]): AiChain {
  return createAiChain(providers, { timeoutMs: 200, log: () => {} });
}

/**
 * A provider that "plans" like a model would: it reads the dates and pace from the prompt
 * and answers with a valid trip, or a valid single day for regenerate prompts. Each answer
 * gets a fresh tag (R1, R2 …) so tests can tell regenerated days apart.
 */
export function plannerProvider(name: 'gemini' | 'groq' = 'gemini', chunks = 4): FakeProvider {
  let answers = 0;
  const provider: FakeProvider = {
    name,
    model: `${name}-planner`,
    calls: 0,
    signals: [],
    async *stream(prompt, signal) {
      provider.calls += 1;
      provider.signals.push(signal);
      answers += 1;
      const pace = (/Pace: (chill|balanced|packed)/.exec(prompt.user)?.[1] ?? 'balanced') as Pace;
      const [, start, end] = /(\d{4}-\d\d-\d\d) to (\d{4}-\d\d-\d\d)/.exec(prompt.user) ?? [];
      const isDay = prompt.jsonSchema === dayJsonSchema;
      const answer = isDay ? aiDayFixture(pace, `R${answers}`) : aiTripFixture(tripRequest({ startDate: start, endDate: end, pace }), `T${answers}`);
      for (const piece of split(JSON.stringify(answer), chunks)) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (signal.aborted) throw new Error('aborted');
        yield piece;
      }
    },
  };
  return provider;
}

/** A chain whose one model always plans successfully. */
export const plannerChain = (provider: FakeProvider = plannerProvider()) => fakeAiChain(provider);
/** A chain where every model fails. */
export const failingChain = () => fakeAiChain(fakeProvider('gemini', ['error']), fakeProvider('groq', ['error']));

/** A chain that must not be used in this test (fails if it is). */
export function fakeChain(): AiChain {
  return {
    async run() {
      throw aiUnavailable('fake chain: not set up for this test');
    },
  };
}

/** Activities per day for each pace (the middle of the allowed range). */
const PER_DAY: Record<Pace, number> = { chill: 2, balanced: 3, packed: 4 };

/** One valid AI day; `tag` makes titles unique so tests can tell days apart. */
export function aiDayFixture(pace: Pace, tag: string): AiDay {
  const count = PER_DAY[pace];
  const slots = ['morning', 'afternoon', 'evening'] as const;
  return {
    theme: `Theme ${tag}`,
    activities: Array.from({ length: count }, (_, i) => ({
      time: slots[Math.min(2, Math.floor((i * 3) / count))],
      startTime: `${String(9 + i * 3).padStart(2, '0')}:00`,
      title: `Stop ${tag}.${i + 1}`,
      description: `Something lovely {with "quotes"} at stop ${i + 1}.`,
      location: `Place ${i + 1}`,
      estCost: 200 * (i + 1),
      ...(i < count - 1 ? { transfer: { mode: 'auto' as const, minutes: 15 } } : {}),
    })),
  };
}

/** A valid AI answer for a trip request (right number of days, right pace). */
export function aiTripFixture(req: TripRequest, tag = 'A'): AiTrip {
  const days = tripDates(req.startDate, req.endDate).map((_, i) => aiDayFixture(req.pace, `${tag}${i + 1}`));
  return {
    title: `${days.length} days in ${req.destination}`,
    summary: `A ${req.pace} trip through ${req.destination}.`,
    days,
    breakdown: { stay: 6000, food: 3000, transport: 1500, activities: 1200 },
    tips: ['Carry cash for autos.'],
    packingList: ['Sunscreen'],
  };
}

/** A trip request for tests (3 days in Goa, balanced). */
export function tripRequest(overrides: Partial<TripRequest> = {}): TripRequest {
  return {
    destination: 'Goa',
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    budget: { amount: 3000, currency: 'INR' },
    travellers: 'couple',
    interests: ['food', 'culture'],
    pace: 'balanced',
    ...overrides,
  };
}
