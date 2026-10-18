/**
 * schema.ts — the exact shape we ask the AI to write, as Zod schemas.
 *
 * The AI writes only the creative part of a trip (title, days, costs, tips). The server
 * adds everything factual afterwards — ids, dates, totals, who asked (services/buildItinerary.ts).
 *
 * The same schema is turned into JSON Schema and handed to the model, so Gemini is
 * *forced* to answer in this shape and Groq is told it. Fine-grained rules a JSON Schema
 * can't express well (times in order, number of stops per pace) live in validate.ts.
 */
import { z } from 'zod';

/** One stop in a day. */
export const aiActivitySchema = z.object({
  time: z.enum(['morning', 'afternoon', 'evening']).describe('Part of the day'),
  startTime: z.string().describe('Start time, 24-hour HH:MM, e.g. "09:30"'),
  title: z.string().min(1).describe('Name of a real place or experience'),
  description: z.string().min(1).describe('One or two friendly sentences on what to do there and why'),
  location: z.string().optional().describe('Area or neighbourhood'),
  estCost: z.number().min(0).describe('Rough cost for the whole group in INR (0 if free)'),
  transfer: z
    .object({
      mode: z.enum(['walk', 'auto', 'cab', 'bus', 'train', 'boat']),
      minutes: z.number().min(0),
    })
    .optional()
    .describe('How to get to the NEXT stop; leave out on the last stop of the day'),
});

/** One day: a short theme and its stops in time order. */
export const aiDaySchema = z.object({
  theme: z.string().min(1).describe('A short theme for the day, e.g. "Old town and local flavours"'),
  activities: z.array(aiActivitySchema).min(1),
});

/** The whole AI answer for a trip. */
export const aiTripSchema = z.object({
  title: z.string().min(1).describe('Short title, e.g. "3 days in Goa"'),
  region: z
    .enum(['himalaya', 'thar', 'ganga', 'deccan', 'ghats', 'konkan', 'sisters', 'abroad', 'none'])
    .describe("Which of India's seven worlds the destination is in, 'abroad' outside India, or 'none' if unsure"),
  summary: z.string().min(1).describe('One natural sentence describing the trip'),
  days: z.array(aiDaySchema).min(1),
  breakdown: z
    .object({
      stay: z.number().min(0),
      food: z.number().min(0),
      transport: z.number().min(0),
      activities: z.number().min(0),
    })
    .describe('Estimated cost for the whole group and the whole trip, in INR'),
  tips: z.array(z.string()).describe('3 to 5 practical local tips'),
  packingList: z.array(z.string()).describe('5 to 10 things to pack for this place and season'),
});

/** One AI-written stop. */
export type AiActivity = z.infer<typeof aiActivitySchema>;
/** One AI-written day. */
export type AiDay = z.infer<typeof aiDaySchema>;
/** A whole AI-written trip. */
export type AiTrip = z.infer<typeof aiTripSchema>;

/** Zod → plain JSON Schema for the model (without the "$schema" line some APIs reject). */
function toModelSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void $schema;
  return rest;
}

/** JSON Schema of a whole trip answer. */
export const tripJsonSchema = toModelSchema(aiTripSchema);
/** JSON Schema of a single-day answer. */
export const dayJsonSchema = toModelSchema(aiDaySchema);
