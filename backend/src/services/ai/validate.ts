/**
 * validate.ts — never trust an AI answer until it is checked.
 *
 * An answer is rejected (InvalidAiOutput) if it isn't complete JSON, doesn't match the
 * schema, or doesn't make sense for the request: the wrong number of days, too many or
 * too few stops for the pace, times going backwards, or a transfer after the last stop.
 * The fallback chain then tries the next model, so a bad answer is never saved.
 */
import { tripDates } from '../../lib/dates.js';
import type { Pace, TripRequest } from '../../types/api.js';
import { ACTIVITIES_PER_DAY } from './prompt.js';
import { aiDaySchema, aiTripSchema, type AiDay, type AiTrip } from './schema.js';

/** The AI's answer can't be used; `message` says why (for logs, never shown to users). */
export class InvalidAiOutput extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidAiOutput';
  }
}

/** "HH:MM" with valid hours and minutes. */
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Read JSON, tolerating a ```json … ``` fence some models wrap around it. */
function readJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new InvalidAiOutput('not complete JSON (cut off or extra text)');
  }
}

/** Check one day's stops against the pace and the time rules. */
function checkDay(day: AiDay, pace: Pace, label: string): void {
  const expected = ACTIVITIES_PER_DAY[pace];
  const count = day.activities.length;
  if (count < expected - 1 || count > expected + 1) {
    throw new InvalidAiOutput(`${label}: ${count} activities for a ${pace} pace (expected ${expected - 1}–${expected + 1})`);
  }
  let previous = '';
  day.activities.forEach((activity, index) => {
    if (!CLOCK.test(activity.startTime)) throw new InvalidAiOutput(`${label}: start time "${activity.startTime}" is not HH:MM`);
    if (previous && activity.startTime <= previous) throw new InvalidAiOutput(`${label}: start times must rise through the day`);
    previous = activity.startTime;
    if (index === count - 1 && activity.transfer) throw new InvalidAiOutput(`${label}: the last stop has a transfer`);
  });
}

/** Check every day of a trip against the request. */
export function checkDays(days: AiDay[], req: TripRequest): void {
  const expected = tripDates(req.startDate, req.endDate).length;
  if (days.length !== expected) throw new InvalidAiOutput(`${days.length} days written, ${expected} needed`);
  days.forEach((day, index) => checkDay(day, req.pace, `day ${index + 1}`));
}

/** Turn a model's text into a checked trip, or throw InvalidAiOutput. */
export function parseTrip(text: string, req: TripRequest): AiTrip {
  const result = aiTripSchema.safeParse(readJson(text));
  if (!result.success) throw new InvalidAiOutput(`schema: ${result.error.issues[0]?.path.join('.')} ${result.error.issues[0]?.message}`);
  checkDays(result.data.days, req);
  return result.data;
}

/** Turn a model's text into one checked day, or throw InvalidAiOutput. */
export function parseDay(text: string, pace: Pace): AiDay {
  const result = aiDaySchema.safeParse(readJson(text));
  if (!result.success) throw new InvalidAiOutput(`schema: ${result.error.issues[0]?.path.join('.')} ${result.error.issues[0]?.message}`);
  checkDay(result.data, pace, 'day');
  return result.data;
}
