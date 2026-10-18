/**
 * errors.ts (middleware) — the last stop for every request.
 *
 * - `notFoundHandler`: no route matched → 404 NOT_FOUND.
 * - `errorHandler`: turns any thrown error into `{ error: { code, message } }`.
 *   Expected errors (AppError) keep their status and message; invalid input (Zod) becomes
 *   400 VALIDATION; anything unexpected is logged and hidden behind a friendly 500, so
 *   internal details never reach the browser.
 */
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

/** No route matched this URL. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: "That page of the API doesn't exist." } });
};

/** Turn any error into the API's error shape. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  // If a response is already being streamed, Express must close it itself.
  if (res.headersSent) return next(error);

  // Errors we threw on purpose.
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  // Invalid input caught by a Zod schema: show the first problem.
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'Please check what you entered.';
    res.status(400).json({ error: { code: 'VALIDATION', message } });
    return;
  }

  // Malformed JSON bodies or bodies that are too large (from express.json()).
  const status = (error as { status?: number }).status;
  if (status === 400 || status === 413) {
    const message = status === 413 ? 'That request is too large.' : "We couldn't read that request.";
    res.status(status).json({ error: { code: 'VALIDATION', message } });
    return;
  }

  // Anything else is a bug or an outage: log it for us, keep it vague for the user.
  console.error('[api] unexpected error:', error);
  res.status(500).json({ error: { code: 'SERVER', message: 'Something went wrong on our side. Please try again.' } });
};
