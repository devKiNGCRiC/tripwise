/**
 * errors.ts — the API's one error type and its helpers.
 *
 * Any route can `throw notFound('…')` (etc.). The error middleware (middleware/errors.ts)
 * turns it into the response shape the frontend expects:
 *   { error: { code, message } }   with the matching HTTP status.
 */

/** Machine-readable error codes — the same list as the frontend (minus its client-only NETWORK). */
export type ApiErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'QUOTA_EXCEEDED' | 'AI_UNAVAILABLE' | 'SERVER';

/** An error we expect and want to show to the user, with its HTTP status and code. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 400 — the request itself is wrong (bad input). */
export const badRequest = (message: string) => new AppError(400, 'VALIDATION', message);
/** 409 — valid input that clashes with existing data (e.g. email already used). */
export const conflict = (message: string) => new AppError(409, 'VALIDATION', message);
/** 401 — not logged in, or the login has expired. */
export const unauthorized = (message = 'Please log in to continue.') => new AppError(401, 'UNAUTHORIZED', message);
/** 403 — logged in, but not allowed (e.g. a blocked account). */
export const forbidden = (message: string) => new AppError(403, 'FORBIDDEN', message);
/** 404 — nothing here (also used for other people's private things, so we don't reveal they exist). */
export const notFound = (message = "We couldn't find that.") => new AppError(404, 'NOT_FOUND', message);
/** 429 — a daily allowance is used up. */
export const quotaExceeded = (message: string) => new AppError(429, 'QUOTA_EXCEEDED', message);
/** 503 — every AI model failed or is busy. */
export const aiUnavailable = (message = 'Our AI planners are busy right now. Please try again in a minute.') =>
  new AppError(503, 'AI_UNAVAILABLE', message);
