/**
 * chain.ts — the AI fallback chain.
 *
 * Models are tried one after another (Gemini Flash → Flash-Lite → Groq …). Each attempt
 * streams text and may not go silent for more than 25 s (nor run past 90 s in total), and
 * its answer must pass `parse` (validate.ts).
 * A slow, failing or nonsensical model just hands over to the next one. Only when all of
 * them fail does the traveller see "our planners are busy" (503 AI_UNAVAILABLE).
 *
 * For streaming, `onText` receives text as it arrives, and `onReset` says "throw away what
 * you showed so far — another model is starting". If the traveller leaves (`signal`), the
 * current model is cancelled and no other model is tried.
 */
import { aiUnavailable } from '../../lib/errors.js';
import type { Prompt } from './prompt.js';
import { InvalidAiOutput } from './validate.js';

/** One AI model we can stream an answer from. */
export interface AiProvider {
  name: 'gemini' | 'groq';
  model: string;
  /** Stream the answer's text; must stop when `signal` is cancelled. */
  stream(prompt: Prompt, signal: AbortSignal): AsyncIterable<string>;
}

/** Optional live hooks for one run. */
export interface ChainHooks {
  /** Text as it arrives from the current model. */
  onText?(chunk: string): void;
  /** The current model failed after sending text; another starts from scratch. */
  onReset?(): void;
  /** Cancelled when the traveller leaves; stops everything. */
  signal?: AbortSignal;
}

/** What a successful run returns. */
export interface ChainResult<T> {
  value: T;
  provider: 'gemini' | 'groq';
  model: string;
}

/** Something that turns a prompt into a checked value, trying models in order. */
export interface AiChain {
  run<T>(prompt: Prompt, parse: (text: string) => T, hooks?: ChainHooks): Promise<ChainResult<T>>;
}

/** One line in the log per attempt (no prompts, keys or personal data). */
export interface AttemptLog {
  provider: 'gemini' | 'groq';
  model: string;
  ms: number;
  outcome: 'ok' | 'invalid' | 'timeout' | 'error';
  reason?: string;
}

/** Thrown when the traveller left before the plan was ready. */
export class ClientGone extends Error {
  constructor() {
    super('The traveller left before the plan was ready.');
    this.name = 'ClientGone';
  }
}

/** Default: write each attempt to the server log as one short line. */
const defaultLog = (entry: AttemptLog) => console.log(`[ai] ${entry.provider}/${entry.model} ${entry.outcome} ${entry.ms}ms${entry.reason ? ` (${entry.reason})` : ''}`);

/**
 * Pull items from an async stream, but give up as soon as `signal` is cancelled — even if
 * the provider itself is stuck and ignores the signal.
 */
async function* untilCancelled<T>(source: AsyncIterable<T>, signal: AbortSignal): AsyncGenerator<T> {
  const iterator = source[Symbol.asyncIterator]();
  const cancelled = new Promise<never>((_, reject) => {
    const fail = () => reject(new Error('cancelled'));
    if (signal.aborted) fail();
    else signal.addEventListener('abort', fail, { once: true });
  });
  cancelled.catch(() => {}); // handled below; avoid "unhandled rejection" noise
  try {
    while (true) {
      const next = await Promise.race([iterator.next(), cancelled]);
      if (next.done) return;
      yield next.value;
    }
  } finally {
    // Let the provider clean up (close its HTTP stream) without waiting for it.
    void iterator.return?.();
  }
}

/** Build a chain over the given providers. */
export function createAiChain(providers: AiProvider[], opts: { timeoutMs?: number; maxMs?: number; log?: (entry: AttemptLog) => void } = {}): AiChain {
  // A model may be silent for at most `timeoutMs` (first text, or between pieces) …
  const timeoutMs = opts.timeoutMs ?? 25_000;
  // … and may take at most `maxMs` in total (long trips stream for 40 s or more).
  const maxMs = opts.maxMs ?? 90_000;
  const log = opts.log ?? defaultLog;

  return {
    async run(prompt, parse, hooks = {}) {
      for (const provider of providers) {
        if (hooks.signal?.aborted) throw new ClientGone();

        // This attempt is cancelled by its timers or by the traveller leaving.
        const controller = new AbortController();
        let timedOut = false;
        const giveUp = () => {
          timedOut = true;
          controller.abort();
        };
        // The silence timer restarts whenever text arrives; the total timer never does.
        let silence = setTimeout(giveUp, timeoutMs);
        const total = setTimeout(giveUp, maxMs);
        const leave = () => controller.abort();
        hooks.signal?.addEventListener('abort', leave, { once: true });

        const started = Date.now();
        let text = '';
        try {
          for await (const chunk of untilCancelled(provider.stream(prompt, controller.signal), controller.signal)) {
            if (!chunk) continue;
            clearTimeout(silence);
            silence = setTimeout(giveUp, timeoutMs);
            text += chunk;
            hooks.onText?.(chunk);
          }
          const value = parse(text);
          log({ provider: provider.name, model: provider.model, ms: Date.now() - started, outcome: 'ok' });
          return { value, provider: provider.name, model: provider.model };
        } catch (error) {
          // The traveller left: stop here, try nothing else.
          if (hooks.signal?.aborted) throw new ClientGone();
          const outcome = timedOut ? 'timeout' : error instanceof InvalidAiOutput ? 'invalid' : 'error';
          const reason = outcome === 'timeout' ? undefined : (error as Error).message?.slice(0, 160);
          log({ provider: provider.name, model: provider.model, ms: Date.now() - started, outcome, reason });
          // Anything already shown came from a failed model: tell the stream to start over.
          if (text) hooks.onReset?.();
        } finally {
          clearTimeout(silence);
          clearTimeout(total);
          hooks.signal?.removeEventListener('abort', leave);
          controller.abort();
        }
      }
      throw aiUnavailable();
    },
  };
}
