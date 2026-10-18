/**
 * partialJson.ts — read a trip while the AI is still writing it.
 *
 * The AI streams one big JSON object: { "title": …, "summary": …, "days": [ {…}, {…} ], … }.
 * We can't JSON.parse it until it ends, so instead we walk through the characters as they
 * arrive, keeping track of whether we're inside a string and how deeply nested we are:
 *
 *   - a string value right after the top-level "title" / "summary" keys is captured, and
 *     once both are known they are reported (once) as `meta`;
 *   - inside the top-level "days" array, each { … } at the first level is one day: the
 *     moment its closing brace arrives it is parsed, checked and reported.
 *
 * Text is only scanned once (we remember where we stopped), so this stays fast.
 */
import { aiDaySchema, type AiDay } from './schema.js';

/** What one push reports: newly complete pieces only. */
export interface StreamUpdate {
  meta?: { title: string; summary: string };
  days: AiDay[];
}

/** A reader for one streamed trip. */
export function createTripStreamParser(): { push(chunk: string): StreamUpdate } {
  let text = '';
  let position = 0;

  // Where we are in the JSON.
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;

  // Top-level keys and values ("key": value pairs of the outer object).
  let lastKey = '';
  let expectingValue = false;

  // The "days" array and the day currently being read.
  let inDays = false;
  let dayStart = -1;

  // Title and summary, reported once both are known.
  const meta: { title?: string; summary?: string } = {};
  let metaSent = false;

  return {
    push(chunk) {
      text += chunk;
      const days: AiDay[] = [];

      for (; position < text.length; position++) {
        const char = text[position];

        // Inside a string only an unescaped quote matters.
        if (inString) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') {
            inString = false;
            // A finished string directly inside the outer object: a key or a value.
            if (depth === 1) {
              const value = JSON.parse(text.slice(stringStart, position + 1)) as string;
              if (expectingValue) {
                if (lastKey === 'title') meta.title = value;
                if (lastKey === 'summary') meta.summary = value;
                expectingValue = false;
              } else {
                lastKey = value;
              }
            }
          }
          continue;
        }

        switch (char) {
          case '"':
            inString = true;
            stringStart = position;
            break;
          case ':':
            if (depth === 1) expectingValue = true;
            break;
          case ',':
            if (depth === 1) expectingValue = false;
            break;
          case '[':
            // The value of "days" starts: from now on, level-2 objects are days.
            if (depth === 1 && expectingValue && lastKey === 'days') inDays = true;
            depth++;
            break;
          case '{':
            if (inDays && depth === 2) dayStart = position;
            depth++;
            break;
          case '}':
            depth--;
            // A day just closed: parse it, keep it only if it is a valid day.
            if (inDays && depth === 2 && dayStart >= 0) {
              try {
                const day = aiDaySchema.safeParse(JSON.parse(text.slice(dayStart, position + 1)));
                if (day.success) days.push(day.data);
              } catch {
                // Not valid JSON after all; the final check will catch the whole answer.
              }
              dayStart = -1;
            }
            break;
          case ']':
            depth--;
            if (inDays && depth === 1) inDays = false;
            break;
        }
      }

      // Title and summary: report once, as soon as both are complete.
      let update: StreamUpdate['meta'];
      if (!metaSent && meta.title !== undefined && meta.summary !== undefined) {
        metaSent = true;
        update = { title: meta.title, summary: meta.summary };
      }
      return update ? { meta: update, days } : { days };
    },
  };
}
