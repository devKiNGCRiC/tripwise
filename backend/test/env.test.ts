/**
 * env.test.ts — the API refuses to start with missing or weak settings, and reads model lists.
 */
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

/** The smallest set of settings that is valid. */
const valid = { MONGO_URI: 'mongodb://x/tripwise', JWT_SECRET: 'x'.repeat(32) };

describe('loadEnv', () => {
  it('names the missing setting', () => {
    expect(() => loadEnv({})).toThrow(/MONGO_URI/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('splits and trims model lists, with defaults', () => {
    const env = loadEnv({ ...valid, GEMINI_MODELS: 'a, b' });
    expect(env.GEMINI_MODELS).toEqual(['a', 'b']);
    expect(env.GROQ_MODELS).toEqual(['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']);
    expect(env.PORT).toBe(4000);
  });
});
