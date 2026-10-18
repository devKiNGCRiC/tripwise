/**
 * index.ts — builds the real AI chain from the settings: every Gemini model, then every
 * Groq model, in the order listed in .env. A provider without a key is skipped.
 */
import type { Env } from '../../config/env.js';
import { createAiChain, type AiChain, type AiProvider } from './chain.js';
import { geminiProvider } from './gemini.js';
import { groqProvider } from './groq.js';

/** The production chain. Warns (doesn't crash) if no AI key is set at all. */
export function buildChain(env: Env): AiChain {
  const providers: AiProvider[] = [];
  if (env.GEMINI_API_KEY) providers.push(...env.GEMINI_MODELS.map((model) => geminiProvider(env.GEMINI_API_KEY!, model)));
  if (env.GROQ_API_KEY) providers.push(...env.GROQ_MODELS.map((model) => groqProvider(env.GROQ_API_KEY!, model)));
  if (providers.length === 0) console.warn('[ai] No GEMINI_API_KEY or GROQ_API_KEY set — trip generation will report "busy".');
  else console.log(`[ai] Models in order: ${providers.map((p) => `${p.name}/${p.model}`).join(' → ')}`);
  return createAiChain(providers);
}
