/**
 * chain.ts — the AI fallback chain's public shape. (The full chain arrives in Task 6.)
 */

/** Something that turns a prompt into a validated value, trying AI models in order. */
export interface AiChain {
  run<T>(prompt: unknown, parse: (text: string) => T): Promise<{ value: T; provider: 'gemini' | 'groq'; model: string }>;
}
