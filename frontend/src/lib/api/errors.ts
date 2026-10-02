/**
 * errors.ts — one error type for everything that can go wrong talking to the API.
 *
 * Components never inspect raw HTTP statuses; they check `error.code`
 * (e.g. 'QUOTA_EXCEEDED') and can show `error.message`, which is always
 * human-friendly — either the server's own message or our fallback below.
 */
import type { ApiErrorBody, ApiErrorCode } from './types';

/** Friendly fallback text for each code, used when the server didn't send a message. */
const FRIENDLY: Record<ApiErrorCode, string> = {
  VALIDATION: 'Some details look off. Please check and try again.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: "You don't have access to that.",
  NOT_FOUND: "We couldn't find that.",
  QUOTA_EXCEEDED: "You've used all your trip generations for today.",
  AI_UNAVAILABLE: 'Both AI planners are busy right now. Try again in a minute.',
  SERVER: 'Something went wrong on our side. Please try again.',
  NETWORK: "We can't reach TripWise right now. Check your connection and try again.",
};

/** The friendly default message for an error code. */
export function friendlyMessage(code: ApiErrorCode): string {
  return FRIENDLY[code];
}

/** A failed API call. `status` is the HTTP status (0 when the network failed). */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Best-guess code when the body didn't include one (e.g. a proxy's HTML error page).
 * QUOTA_EXCEEDED and AI_UNAVAILABLE are deliberately NOT guessed from 429/503:
 * a hosting proxy's 503 during login must not claim "AI planners are busy".
 * Those codes only come from our API's own JSON error bodies.
 */
function statusToCode(status: number): ApiErrorCode {
  if (status === 400 || status === 409 || status === 422) return 'VALIDATION';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  return 'SERVER';
}

/** Type guard: does this parsed body look like our `{ error: { code, message } }` shape? */
function isErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const error = (body as { error: unknown }).error;
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: unknown }).code === 'string';
}

/** Turn any failed response (status + parsed body, possibly null) into an ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  if (isErrorBody(body)) {
    const code = body.error.code in FRIENDLY ? body.error.code : statusToCode(status);
    return new ApiError(code, body.error.message || FRIENDLY[code], status, body.error.details);
  }
  const code = statusToCode(status);
  return new ApiError(code, FRIENDLY[code], status);
}
