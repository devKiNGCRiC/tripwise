/**
 * gemini.ts — Google Gemini as an AI provider (free tier, the "TripWise" AI Studio project).
 * Gemini is given the JSON Schema directly, so its answers are forced into our shape.
 */
import { GoogleGenAI } from '@google/genai';
import type { AiProvider } from './chain.js';

/** A Gemini model, streaming JSON text. */
export function geminiProvider(apiKey: string, model: string): AiProvider {
  const client = new GoogleGenAI({ apiKey });
  return {
    name: 'gemini',
    model,
    async *stream(prompt, signal) {
      const response = await client.models.generateContentStream({
        model,
        contents: prompt.user,
        config: {
          systemInstruction: prompt.system,
          responseMimeType: 'application/json',
          responseJsonSchema: prompt.jsonSchema,
          // Long trips (14 days, packed) need room; a cut-off answer fails validation anyway.
          maxOutputTokens: 16_384,
          temperature: 0.8,
          abortSignal: signal,
        },
      });
      for await (const chunk of response) {
        if (chunk.text) yield chunk.text;
      }
    },
  };
}
