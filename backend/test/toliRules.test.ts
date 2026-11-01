/**
 * toliRules.test.ts — the pure rules shared by the API and the website's demo mock:
 *   canPost       who may write in Chaupal (announcement mode, one-message and timed grants)
 *   applySujhav   every kind of suggestion applied to a plan, refusing stale ones and over-long trips,
 *                 never touching the original, and keeping the last stop of a day without a transfer
 *   tallyPoll     counts, who voted and who hasn't — current members only
 *   budgetRange   the overlap everyone is comfortable with (or the gap to bridge), members only
 */
import { describe, expect, it } from 'vitest';
import { applySujhav, budgetRange, canPost, defaultsForType, isLeader, tallyPoll, type DayLike } from '../src/services/toliRules.js';

const NOW = '2026-11-01T10:00:00.000Z';

/** A small two-day plan. */
function plan(): DayLike[] {
  return [
    {
      dayNumber: 1,
      date: '2026-12-01',
      theme: 'Old Goa',
      activities: [
        { time: 'morning', startTime: '09:00', title: 'Basilica of Bom Jesus', description: 'Church.', transfer: { mode: 'walk', minutes: 5 } },
        { time: 'afternoon', startTime: '12:00', title: 'Se Cathedral', description: 'Cathedral.', transfer: { mode: 'cab', minutes: 30 } },
        { time: 'evening', startTime: '17:00', title: 'Miramar Beach', description: 'Sunset.' },
      ],
    },
    { dayNumber: 2, date: '2026-12-02', theme: 'North', activities: [{ time: 'morning', startTime: '10:00', title: 'Fort Aguada', description: 'Fort.' }] },
  ];
}

describe('roles and posting', () => {
  it('knows the leaders', () => {
    expect([isLeader('sutradhar'), isLeader('sah'), isLeader('sahyatri')]).toEqual([true, true, false]);
  });

  it('lets leaders always post, and others only when allowed in announcement mode', () => {
    expect(canPost({ role: 'sah' }, true, NOW)).toBe(true);
    expect(canPost({ role: 'sahyatri' }, true, NOW)).toBe(false);
    expect(canPost({ role: 'sahyatri', oneMessage: true }, true, NOW)).toBe(true);
    expect(canPost({ role: 'sahyatri', postUntil: '2026-11-01T10:30:00.000Z' }, true, NOW)).toBe(true);
    expect(canPost({ role: 'sahyatri', postUntil: '2026-11-01T09:30:00.000Z' }, true, NOW)).toBe(false);
    expect(canPost({ role: 'sahyatri' }, false, NOW)).toBe(true);
  });

  it('starts college and office Tolis in announcement mode', () => {
    expect(defaultsForType('college').announcementMode).toBe(true);
    expect(defaultsForType('office').announcementMode).toBe(true);
    expect(defaultsForType('friends').announcementMode).toBe(false);
  });
});

describe('applySujhav', () => {
  const stop = { time: 'afternoon' as const, startTime: '14:00', title: 'Fontainhas walk', description: 'Latin quarter.' };

  it('adds, removes, swaps and moves stops without touching the original', () => {
    const days = plan();
    const before = structuredClone(days);
    const added = applySujhav(days, { kind: 'add-stop', day: 1, at: 2, stop }, 14);
    expect(added.ok && added.days[0].activities.map((a) => a.title)).toEqual(['Basilica of Bom Jesus', 'Se Cathedral', 'Fontainhas walk', 'Miramar Beach']);
    expect(days).toEqual(before);

    const removed = applySujhav(days, { kind: 'remove-stop', day: 1, index: 1, title: 'Se Cathedral' }, 14);
    expect(removed.ok && removed.days[0].activities.map((a) => a.title)).toEqual(['Basilica of Bom Jesus', 'Miramar Beach']);

    const swapped = applySujhav(days, { kind: 'swap-stop', day: 2, index: 0, title: 'Fort Aguada', stop }, 14);
    expect(swapped.ok && swapped.days[1].activities[0].title).toBe('Fontainhas walk');

    const moved = applySujhav(days, { kind: 'move-stop', day: 1, index: 2, title: 'Miramar Beach', toDay: 2, toIndex: 1 }, 14);
    expect(moved.ok && moved.days[0].activities.map((a) => a.title)).toEqual(['Basilica of Bom Jesus', 'Se Cathedral']);
    expect(moved.ok && moved.days[1].activities.map((a) => a.title)).toEqual(['Fort Aguada', 'Miramar Beach']);
    // Se Cathedral is now day 1's last stop: no transfer onwards.
    expect(moved.ok && moved.days[0].activities[1].transfer).toBeUndefined();
  });

  it('rethemes a day, adds a day with the next date, and changes transport', () => {
    const days = plan();
    const themed = applySujhav(days, { kind: 'retheme-day', day: 2, theme: 'Beaches' }, 14);
    expect(themed.ok && themed.days[1].theme).toBe('Beaches');
    const longer = applySujhav(days, { kind: 'add-day', theme: 'Rest day' }, 14);
    expect(longer.ok && longer.days[2]).toEqual({ dayNumber: 3, date: '2026-12-03', theme: 'Rest day', activities: [] });
    const bus = applySujhav(days, { kind: 'change-transport', day: 1, index: 1, title: 'Se Cathedral', mode: 'bus' }, 14);
    expect(bus.ok && bus.days[0].activities[1].transfer).toEqual({ mode: 'bus', minutes: 30 });
  });

  it('refuses suggestions about a plan that has changed, and trips past the limit', () => {
    const days = plan();
    expect(applySujhav(days, { kind: 'remove-stop', day: 1, index: 1, title: 'Old name' }, 14)).toEqual({ ok: false, reason: 'stale' });
    expect(applySujhav(days, { kind: 'retheme-day', day: 9, theme: 'x' }, 14)).toEqual({ ok: false, reason: 'stale' });
    // The last stop of a day has no next stop to change the transport to.
    expect(applySujhav(days, { kind: 'change-transport', day: 1, index: 2, title: 'Miramar Beach', mode: 'bus' }, 14)).toEqual({ ok: false, reason: 'stale' });
    expect(applySujhav(days, { kind: 'add-day', theme: 'x' }, 2)).toEqual({ ok: false, reason: 'too-long' });
  });
});

describe('tallyPoll', () => {
  it('counts current members only and says who hasn’t voted', () => {
    const tally = tallyPoll([{ id: 'a' }, { id: 'b' }], { u1: ['a'], u2: ['a', 'b'], gone: ['b'] }, ['u1', 'u2', 'u3']);
    expect(tally.counts).toEqual({ a: 2, b: 1 });
    expect(tally.voted).toEqual(['u1', 'u2']);
    expect(tally.notVoted).toEqual(['u3']);
    expect(tally.leading).toEqual(['a']);
  });

  it('reports ties as several leaders, and none before any vote', () => {
    expect(tallyPoll([{ id: 'a' }, { id: 'b' }], { u1: ['a'], u2: ['b'] }, ['u1', 'u2']).leading).toEqual(['a', 'b']);
    expect(tallyPoll([{ id: 'a' }], {}, ['u1']).leading).toEqual([]);
  });
});

describe('budgetRange', () => {
  it('finds the overlap everyone is comfortable with', () => {
    expect(budgetRange({ u1: [2000, 3000], u2: [2500, 4000] }, ['u1', 'u2'])).toEqual({ answered: 2, range: [2500, 3000] });
  });

  it('shows the gap when there is no overlap', () => {
    expect(budgetRange({ u1: [1000, 1500], u2: [2500, 4000] }, ['u1', 'u2'])).toEqual({ answered: 2, range: null, closest: [1500, 2500] });
  });

  it('ignores people who left, and has no range until someone answers', () => {
    expect(budgetRange({ u1: [2000, 3000], gone: [5000, 9000] }, ['u1', 'u2'])).toEqual({ answered: 1, range: [2000, 3000] });
    expect(budgetRange({}, ['u1'])).toEqual({ answered: 0, range: null });
  });
});
