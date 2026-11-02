/**
 * writeGuide.test.ts — writing one destination's guide (fake sources and a fake AI; no network):
 *   - the AI is given the Wikivoyage and Wikipedia texts and asked to use only them
 *   - a checked guide credits both sources
 *   - a draft that fails the check is tried once more with the reasons; still failing → reasons back
 *   - with no Wikivoyage page, Wikipedia alone is used
 */
import { describe, expect, it } from 'vitest';
import type { Prompt } from '../src/services/ai/prompt.js';
import { sourceTitles, writeGuide } from '../scripts/guides/writeGuide.js';
import { fakeAiChain } from './helpers/fakeAi.js';

const VOYAGE = 'Gangtok. See: Rumtek Monastery, Do Drul Chorten, Tsomgo Lake, Nathu La, Namgyal Institute of Tibetology. Do: Gangtok Ropeway, MG Marg, Banjhakri Falls. Eat: momos, thukpa, phagshapa, sel roti.';
const PEDIA = 'Gangtok is the capital of Sikkim. The Namgyal dynasty moved the capital from Tumlong to Gangtok in 1894.';

/** A draft the check accepts. */
const good = {
  about: 'Gangtok is the tidy hill capital of Sikkim, strung along a ridge with views of the high Himalaya on clear mornings.',
  history: 'The Namgyal dynasty ruled Sikkim and moved its capital from Tumlong to Gangtok in 1894.',
  significance: 'A centre of Tibetan Buddhist learning with Rumtek Monastery close by.',
  thingsToDo: ['Rumtek Monastery', 'Tsomgo Lake', 'Nathu La', 'Gangtok Ropeway', 'MG Marg', 'Banjhakri Falls'].map((title) => ({ title: `Visit ${title}`, detail: 'Worth it.' })),
  food: ['Momos', 'Thukpa', 'Phagshapa', 'Sel roti'].map((name) => ({ name, detail: 'Local favourite.' })),
};

/** A model that answers with these drafts in turn, remembering the prompts. */
function model(...drafts: object[]) {
  const prompts: Prompt[] = [];
  let i = 0;
  const provider = {
    name: 'gemini' as const,
    model: 'fake',
    async *stream(prompt: Prompt) {
      prompts.push(prompt);
      yield JSON.stringify(drafts[Math.min(i++, drafts.length - 1)]);
    },
  };
  return { ai: fakeAiChain(provider), prompts };
}

/** Sources by wiki (null = no page). */
const sources = (voyage: string | null, pedia: string | null) => async (wiki: 'wikivoyage' | 'wikipedia') => {
  const text = wiki === 'wikivoyage' ? voyage : pedia;
  return text ? { title: 'Gangtok', text, url: `https://en.${wiki}.org/wiki/Gangtok` } : null;
};

const destination = { slug: 'gangtok', name: 'Gangtok' };

describe('writeGuide', () => {
  it('writes a checked guide from both sources and credits them', async () => {
    const { ai, prompts } = model(good);
    const result = await writeGuide(destination, { ai, fetchSource: sources(VOYAGE, PEDIA), today: '2026-11-03' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.guide.sources).toEqual([
      { title: 'Gangtok — Wikivoyage', url: 'https://en.wikivoyage.org/wiki/Gangtok', licence: 'CC BY-SA 4.0' },
      { title: 'Gangtok — Wikipedia', url: 'https://en.wikipedia.org/wiki/Gangtok', licence: 'CC BY-SA 4.0' },
    ]);
    expect(prompts[0].user).toContain('Rumtek Monastery');
    expect(prompts[0].user).toContain('1894');
    expect(prompts[0].system).toMatch(/only/i);
  });

  it('tries once more with the reasons, then gives up', async () => {
    const bad = { ...good, food: [{ name: 'Pizza', detail: 'x' }] };
    const { ai, prompts } = model(bad, bad);
    const result = await writeGuide(destination, { ai, fetchSource: sources(VOYAGE, PEDIA), today: '2026-11-03' });
    expect(result).toMatchObject({ ok: false, reasons: [expect.stringMatching(/food/)] });
    expect(prompts).toHaveLength(2);
    expect(prompts[1].user).toMatch(/food: only 0 dishes/);
  });

  it('uses Wikipedia alone when there is no Wikivoyage page', async () => {
    const { ai, prompts } = model(good);
    const result = await writeGuide(destination, { ai, fetchSource: sources(null, `${PEDIA} ${VOYAGE}`), today: '2026-11-03' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.guide.sources.map((s) => s.title)).toEqual(['Gangtok — Wikipedia']);
    expect(prompts[0].user).not.toContain('Wikivoyage text');
  });

  it('says so when there are no sources at all', async () => {
    const { ai } = model(good);
    expect(await writeGuide(destination, { ai, fetchSource: sources(null, null), today: '2026-11-03' })).toMatchObject({ ok: false, reasons: ['no sources found'] });
  });
});

describe('sourceTitles', () => {
  it('uses the main name, with overrides for tricky ones', () => {
    expect(sourceTitles({ slug: 'dharamshala', name: 'Dharamshala & McLeod Ganj' })).toEqual({ wikivoyage: 'Dharamshala', wikipedia: 'Dharamshala' });
    expect(sourceTitles({ slug: 'kerala', name: 'Kerala Backwaters' }).wikipedia).toBe('Kerala backwaters');
  });
});
