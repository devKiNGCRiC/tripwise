/**
 * monthGuide.test.ts — the month-by-month helpers: weather lines read from the official
 * averages, festival dates (exact while upcoming, "on now" while running, back to "usually"
 * once past), planner links, and that the data covers every world's experiences and places.
 */
import { describe, expect, it } from 'vitest';
import { festivalWhen, planLink, weatherIn } from './monthGuide';
import { REGION_MONTHS } from './regionMonths';
import { REGIONS } from './regions';

const at = (iso: string) => new Date(`${iso}T10:00:00`);
const festival = (key: keyof typeof REGION_MONTHS, name: string) => REGION_MONTHS[key].festivals.find((f) => f.name === name)!;

describe('weatherIn', () => {
  it('reads the range and the feel from the averages', () => {
    expect(weatherIn(REGION_MONTHS.himalaya.climate, 1)).toEqual({ range: '−1 to 11°C', feel: 'Freezing nights · some showers' });
    expect(weatherIn(REGION_MONTHS.konkan.climate, 7)).toEqual({ range: '24 to 29°C', feel: 'Monsoon — rain most days' });
    expect(weatherIn(REGION_MONTHS.thar.climate, 5)).toEqual({ range: '27 to 42°C', feel: 'Very hot days · mostly dry' });
    expect(weatherIn(REGION_MONTHS.sisters.climate, 12)).toEqual({ range: '7 to 16°C', feel: 'Cold nights · mostly dry' });
  });
});

describe('festivalWhen', () => {
  it('gives the exact dates while the festival is still to come', () => {
    expect(festivalWhen(festival('sisters', 'Hornbill Festival'), at('2026-10-20'))).toEqual({ label: '1–10 Dec 2026', expected: false, onNow: false, dated: true });
    expect(festivalWhen(festival('ganga', 'Dev Deepawali'), at('2026-10-20'))).toEqual({ label: '24 Nov 2026', expected: true, onNow: false, dated: true });
    expect(festivalWhen(festival('ganga', 'Magh Mela'), at('2026-10-20')).label).toBe('22 Jan – 6 Mar 2027');
  });

  it('says when a festival is on right now', () => {
    expect(festivalWhen(festival('himalaya', 'Kullu Dussehra'), at('2026-10-22'))).toMatchObject({ onNow: true, label: '20–26 Oct 2026' });
  });

  it('falls back to when it usually happens once the dates have passed (or were never set)', () => {
    expect(festivalWhen(festival('himalaya', 'Kullu Dussehra'), at('2026-11-01'))).toEqual({ label: 'Usually October, from Vijayadashami for a week', expected: false, onNow: false, dated: false });
    expect(festivalWhen(festival('himalaya', 'Hemis Festival'), at('2026-10-20')).dated).toBe(false);
  });
});

describe('planLink', () => {
  it('opens the planner for a place and a month, or exact dates (at most 4 days)', () => {
    expect(planLink('Shillong', { month: 12 })).toBe('/plan?destination=Shillong&month=12');
    expect(planLink('Kohima', { start: '2026-12-01', end: '2026-12-10' })).toBe('/plan?destination=Kohima&start=2026-12-01&end=2026-12-04');
    expect(planLink('Varanasi', { start: '2026-11-24' })).toBe('/plan?destination=Varanasi&start=2026-11-23&end=2026-11-26');
  });
});

describe('the month data', () => {
  it('covers every experience and starting place of every world, with real months', () => {
    for (const region of REGIONS) {
      const data = REGION_MONTHS[region.key];
      expect(Object.keys(data.experiences).sort()).toEqual([...region.sig].sort());
      expect(Object.keys(data.places).sort()).toEqual([...region.places].sort());
      for (const months of [...Object.values(data.experiences).map((e) => e.months), ...Object.values(data.places), ...data.festivals.map((f) => f.months)]) {
        expect(months.length).toBeGreaterThan(0);
        months.forEach((m) => expect(m >= 1 && m <= 12).toBe(true));
      }
      for (const climate of [data.climate.high, data.climate.low, data.climate.rainDays]) expect(climate).toHaveLength(12);
      data.festivals.forEach((f) => expect(f.source).toMatch(/^https:\/\//));
    }
  });
});
