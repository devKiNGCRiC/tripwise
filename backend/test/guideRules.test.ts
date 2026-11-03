/**
 * guideRules.test.ts — checking an AI-written destination guide against its sources before saving:
 *   - dishes must appear in the source text; things to do must mostly use the source's words
 *   - invented items are dropped; too few left (or missing / over-long sections) → rejected
 *   - prices and phone numbers are taken out; lists are capped
 */
import { describe, expect, it } from 'vitest';
import { checkGuide, normalise } from '../src/services/guideRules.js';

/** A trimmed source text about Gangtok (Wikivoyage + Wikipedia style). */
const SOURCE = `Gangtok is the capital of Sikkim. History: the Namgyal dynasty ruled Sikkim; Gangtok became the capital in 1894 after Thutob Namgyal moved it from Tumlong. Enchey Monastery was built in 1909.
See: Rumtek Monastery, the Do Drul Chorten stupa, the Namgyal Institute of Tibetology, Tsomgo Lake and Nathu La pass. Do: ride the Gangtok Ropeway, walk MG Marg, visit the Banjhakri Falls park.
Eat: momos, thukpa, phagshapa (pork fat with radish), sel roti and gundruk soup. Drink chhang, the local millet beer.`;

/** A good draft as a model would write it. */
const draft = () => ({
  about: 'Gangtok is the tidy hill capital of Sikkim, strung along a ridge with views of Kanchenjunga on clear mornings. It is the base for high lakes and monasteries across East Sikkim.',
  history: 'The Namgyal kings ruled Sikkim for centuries. Gangtok became the capital in 1894 when Thutob Namgyal moved it from Tumlong.',
  significance: 'Gangtok is a centre of Tibetan Buddhist learning, home to the Namgyal Institute of Tibetology and Rumtek Monastery nearby.',
  thingsToDo: [
    { title: 'Visit Rumtek Monastery', detail: 'The seat of the Karmapa, a short drive away.' },
    { title: 'Stroll MG Marg', detail: 'The car-free main street, best in the evening.' },
    { title: 'Ride the Gangtok Ropeway', detail: 'Cable car views over the city.' },
    { title: 'See Tsomgo Lake', detail: 'A glacial lake at 3,750 m.' },
    { title: 'Drive to Nathu La pass', detail: 'The old trade pass on the Tibet border (permits needed).' },
    { title: 'Explore the Namgyal Institute of Tibetology', detail: 'Rare manuscripts and thangkas.' },
    { title: 'Paraglide over Rangpo valley', detail: 'Invented — not in the sources.' },
  ],
  food: [
    { name: 'Momos', detail: 'Steamed dumplings, the city’s favourite snack.' },
    { name: 'Thukpa', detail: 'Noodle soup for cold evenings — about ₹150 a bowl, call +91 98765 43210.' },
    { name: 'Phagshapa', detail: 'Pork fat stewed with radish and dried chilli.' },
    { name: 'Sel roti', detail: 'A sweet, ring-shaped rice bread.' },
    { name: 'Butter chicken', detail: 'Invented — not in the sources.' },
  ],
});

/** Where the text came from. */
const meta = { sources: [{ title: 'Gangtok — Wikivoyage', url: 'https://en.wikivoyage.org/wiki/Gangtok', licence: 'CC BY-SA 4.0' }], checked: '2026-11-03' };

describe('checkGuide', () => {
  it('keeps grounded items and drops invented ones', () => {
    const result = checkGuide(draft(), SOURCE, meta);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.guide.food.map((f) => f.name)).toEqual(['Momos', 'Thukpa', 'Phagshapa', 'Sel roti']);
    expect(result.guide.thingsToDo.map((t) => t.title)).not.toContain('Paraglide over Rangpo valley');
    expect(result.guide.thingsToDo).toHaveLength(6);
    expect(result.guide).toMatchObject({ sources: meta.sources, checked: '2026-11-03' });
  });

  it('takes out prices and phone numbers', () => {
    const result = checkGuide(draft(), SOURCE, meta);
    if (!result.ok) throw new Error('expected ok');
    const thukpa = result.guide.food.find((f) => f.name === 'Thukpa')!.detail;
    expect(thukpa).not.toMatch(/₹|\d{5}/);
  });

  it('keeps year ranges (they are not phone numbers)', () => {
    const result = checkGuide({ ...draft(), history: `${draft().history} Surveyed in 1816-1817, built 1909 - 1910.` }, SOURCE, meta);
    if (!result.ok) throw new Error(result.reasons.join('; '));
    expect(result.guide.history).toContain('1816-1817');
    expect(result.guide.history).toContain('1909 - 1910');
  });

  it('rejects a guide with too few grounded items, or missing and over-long sections', () => {
    const fewFoods = { ...draft(), food: [{ name: 'Momos', detail: 'x' }, { name: 'Pizza', detail: 'x' }, { name: 'Sushi', detail: 'x' }] };
    expect(checkGuide(fewFoods, SOURCE, meta)).toMatchObject({ ok: false, reasons: [expect.stringMatching(/food/)] });
    expect(checkGuide({ ...draft(), history: '' }, SOURCE, meta)).toMatchObject({ ok: false });
    expect(checkGuide({ ...draft(), about: 'x'.repeat(901) }, SOURCE, meta)).toMatchObject({ ok: false });
    expect(checkGuide('nonsense', SOURCE, meta)).toMatchObject({ ok: false });
  });

  it('drops "dishes" that are only everyday words (snacks, cold and warm drinks)', () => {
    const source = `${SOURCE}\nEat: snacks, cold and warm drinks, local food.`;
    const vague = { ...draft(), food: [...draft().food, { name: 'snacks', detail: 'x' }, { name: 'cold and warm drinks', detail: 'x' }, { name: 'Local food', detail: 'x' }] };
    const result = checkGuide(vague, source, meta);
    if (!result.ok) throw new Error(result.reasons.join('; '));
    expect(result.guide.food.map((f) => f.name)).toEqual(['Momos', 'Thukpa', 'Phagshapa', 'Sel roti']);
  });

  it('drops things to do that are only an activity ("Trekking"), keeps ones naming a place', () => {
    const source = `${SOURCE}\nDo: trekking, camping, fishing and kayaking; paragliding at Rangpo.`;
    const bare = ['Trekking', 'Camping', 'Fishing', 'Kayaking'].map((title) => ({ title, detail: 'x' }));
    const result = checkGuide({ ...draft(), thingsToDo: [...draft().thingsToDo, ...bare, { title: 'Paragliding at Rangpo', detail: 'x' }] }, source, meta);
    if (!result.ok) throw new Error(result.reasons.join('; '));
    const titles = result.guide.thingsToDo.map((t) => t.title);
    expect(titles).not.toContain('Trekking');
    expect(titles).not.toContain('Kayaking');
    expect(titles).toContain('Paragliding at Rangpo');
  });

  it('caps the lists', () => {
    // Twelve different dishes, all in the sources: only 8 are kept (and a repeat counts once).
    const dishes = ['aloo', 'bhatura', 'chana', 'dal', 'egg curry', 'fish fry', 'gajar halwa', 'idli', 'jalebi', 'kheer', 'laddoo', 'malpua'];
    const source = `${SOURCE}\nEat: ${dishes.join(', ')}.`;
    const many = { ...draft(), food: [...dishes, 'aloo'].map((name) => ({ name, detail: 'Local favourite.' })) };
    const result = checkGuide(many, source, meta);
    if (!result.ok) throw new Error('expected ok');
    expect(result.guide.food).toHaveLength(8);
  });
});

describe('spelling', () => {
  it('matches dishes written with doubled vowels either way (baati / bati, kheer / khir)', () => {
    const source = `${SOURCE}
Eat: dal bati churma, khir, laddu and ghevar.`;
    const spelled = { ...draft(), food: ['Dal Baati Churma', 'Kheer', 'Laddoo', 'Ghevar'].map((name) => ({ name, detail: 'Rajasthani sweet or staple.' })) };
    const result = checkGuide(spelled, source, meta);
    if (!result.ok) throw new Error(result.reasons.join('; '));
    expect(result.guide.food.map((f) => f.name)).toEqual(['Dal Baati Churma', 'Kheer', 'Laddoo', 'Ghevar']);
  });
});

describe('normalise', () => {
  it('compares words without case, accents or punctuation', () => {
    expect(normalise('Tsomgo  Lake!')).toBe('tsomgo lake');
    expect(normalise('Café — Sel-roti')).toBe('cafe sel roti');
  });
});
