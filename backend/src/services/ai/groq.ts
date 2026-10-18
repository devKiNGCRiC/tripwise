/**
 * groq.ts — Groq (free tier) as the backup AI provider, for open models like gpt-oss and Qwen.
 * Groq is asked for a JSON object; the schema itself is in the prompt text, and
 * validate.ts checks the answer strictly either way.
 */
import Groq from 'groq-sdk';
import type { AiProvider } from './chain.js';

/** A Groq-hosted model, streaming JSON text. */
export function groqProvider(apiKey: string, model: string): AiProvider {
  const client = new Groq({ apiKey, maxRetries: 0 });
  return {
    name: 'groq',
    model,
    async *stream(prompt, signal) {
      const stream = await client.chat.completions.create(
        {
          model,
          stream: true,
          temperature: 0.8,
          max_completion_tokens: 16_384,
          response_format: { type: 'json_object' },
          // gpt-oss "thinks" before answering; at its default effort Groq's JSON check often
          // rejects the answer. Low effort passes reliably and is about twice as fast.
          ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' as const } : {}),
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
        },
        { signal },
      );
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
      }
    },
  };
}
