/**
 * placeKinds.test.ts — turning Wikidata "instance of" labels into a TripWise place kind and
 * the interests it suits: travel places are kept (temples, forts, lakes, sanctuaries…),
 * towns, villages, universities and the like are dropped, and the first matching rule wins.
 */
import { describe, expect, it } from 'vitest';
import { classify } from '../src/services/placeKinds.js';

describe('classify', () => {
  it('keeps travel places with the interests they suit', () => {
    expect(classify(['Hindu temple'])).toEqual({ kind: 'temple', interests: ['spiritual', 'culture', 'history'] });
    expect(classify(['waterfall'])).toEqual({ kind: 'water', interests: ['nature', 'photography', 'relaxation'] });
    expect(classify(['fort'])).toEqual({ kind: 'fort', interests: ['history', 'culture', 'photography'] });
    expect(classify(['national park'])).toEqual({ kind: 'wildlife', interests: ['nature', 'adventure', 'photography'] });
    expect(classify(['beach'])).toEqual({ kind: 'beach', interests: ['relaxation', 'nature', 'photography'] });
    expect(classify(['archaeological site'])).toEqual({ kind: 'heritage', interests: ['history', 'culture', 'photography'] });
    expect(classify(['ghat'])?.kind).toBe('ghat');
    expect(classify(['mosque'])?.kind).toBe('shrine');
    expect(classify(['market'])?.interests).toContain('shopping');
    // Rishikesh's jhulas and Meghalaya's root bridges; ashrams are places of worship.
    expect(classify(['suspension bridge'])?.kind).toBe('monument');
    expect(classify(['living root bridge'])?.kind).toBe('monument');
    expect(classify(['ashram'])?.kind).toBe('shrine');
  });

  it('drops places nobody travels to see', () => {
    for (const label of ['village in India', 'town', 'state public university', 'historical country', 'canal', 'railway station']) {
      expect(classify([label])).toBeNull();
    }
    expect(classify([])).toBeNull();
  });

  it('drops church districts, ecoregions and admin areas even when a word looks like a place', () => {
    expect(classify(['particular church', 'diocese of the Catholic Church'])).toBeNull();
    expect(classify(['ecoregion', 'forest'])).toBeNull();
    expect(classify(['district of India', 'hill'])).toBeNull();
    expect(classify(['protected area', 'reserved forest'])?.kind).toBe('nature');
    // Rivers aren't stops (ghats and boat rides cover them); tall buildings aren't monuments.
    expect(classify(['river'])).toBeNull();
    expect(classify(['skyscraper', 'tower'])).toBeNull();
    expect(classify(['hotel', 'heritage site'])).toBeNull();
    expect(classify(['railway bridge'])).toBeNull();
  });

  it('ignores case and uses whole words', () => {
    expect(classify(['Lake'])?.kind).toBe('water');
    // "aggregate" must not match "gate"; "fortune" must not match "fort".
    expect(classify(['aggregate'])).toBeNull();
    expect(classify(['fortune'])).toBeNull();
  });

  it('prefers the most specific kind when a place has several types', () => {
    expect(classify(['tourist attraction', 'Hindu temple'])?.kind).toBe('temple');
    expect(classify(['step well', 'reservoir'])?.kind).toBe('heritage');
    expect(classify(['wildlife sanctuary', 'lake'])?.kind).toBe('wildlife');
  });
});
