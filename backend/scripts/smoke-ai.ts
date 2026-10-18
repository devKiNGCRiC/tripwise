/**
 * smoke-ai.ts — checks that every AI model in .env really works, one at a time.
 *
 *   npm run smoke:ai
 *
 * Each model gets the same small request (2 days in Jaipur) and its answer goes through
 * the same strict checks as real trips. Prints one line per model: ok / invalid / error and
 * how long it took. Uses a few free-tier requests; not part of the test suite.
 */
import 'dotenv/config';
import { loadEnv } from '../src/config/env.js';
import type { AiProvider } from '../src/services/ai/chain.js';
import { geminiProvider } from '../src/services/ai/gemini.js';
import { groqProvider } from '../src/services/ai/groq.js';
import { tripPrompt } from '../src/services/ai/prompt.js';
import { InvalidAiOutput, parseTrip } from '../src/services/ai/validate.js';
import type { TripRequest } from '../src/types/api.js';

const env = loadEnv();

/** A small, typical request (dates far enough ahead to always be valid). */
const start = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const end = new Date(Date.now() + 31 * 86_400_000).toISOString().slice(0, 10);
const request: TripRequest = {
  destination: 'Jaipur',
  startDate: start,
  endDate: end,
  budget: { amount: 3000, currency: 'INR' },
  travellers: 'couple',
  interests: ['food', 'history'],
  pace: 'balanced',
};

/** Every configured model, in chain order. */
const providers: AiProvider[] = [
  ...(env.GEMINI_API_KEY ? env.GEMINI_MODELS.map((model) => geminiProvider(env.GEMINI_API_KEY!, model)) : []),
  ...(env.GROQ_API_KEY ? env.GROQ_MODELS.map((model) => groqProvider(env.GROQ_API_KEY!, model)) : []),
];
if (providers.length === 0) console.log('No AI keys in .env — nothing to check.');

// Try each model on its own and report.
for (const provider of providers) {
  const started = Date.now();
  let text = '';
  try {
    for await (const chunk of provider.stream(tripPrompt(request), AbortSignal.timeout(60_000))) text += chunk;
    const trip = parseTrip(text, request);
    console.log(`${provider.name}/${provider.model} · ok · ${Date.now() - started} ms · "${trip.title}"`);
  } catch (error) {
    const outcome = error instanceof InvalidAiOutput ? 'invalid' : 'error';
    console.log(`${provider.name}/${provider.model} · ${outcome} · ${Date.now() - started} ms · ${(error as Error).message.slice(0, 140)}`);
  }
}
