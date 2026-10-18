/**
 * fakeAi.ts — stand-ins for the AI so tests never call Gemini or Groq.
 * (Grows in Task 6 with scripted providers and a ready-made valid trip.)
 */
import { aiUnavailable } from '../../src/lib/errors.js';
import type { AiChain } from '../../src/services/ai/chain.js';

/** A chain that is never used in a test (fails loudly if it is). */
export function fakeChain(): AiChain {
  return {
    async run() {
      throw aiUnavailable('fake chain: not set up for this test');
    },
  };
}
