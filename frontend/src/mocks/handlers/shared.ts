/**
 * shared.ts — small helpers every mock handler uses:
 * consistent error bodies, fake network latency, and "who is calling?".
 */
import { HttpResponse } from 'msw';
import type { ApiErrorBody, ApiErrorCode } from '@/lib/api/types';
import type { MockUser } from '../data/users';
import { db } from '../db';

/**
 * Build an error response in the exact `{ error: { code, message } }` shape the real API uses.
 * Typed as a plain Response so handlers can mix it with success responses of other shapes.
 */
export function errorResponse(status: number, code: ApiErrorCode, message: string): Response {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

/** Pretend to be a real server (250–600ms) in the browser; instant in tests. */
export async function latency() {
  if (import.meta.env.MODE === 'test') return;
  await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 350));
}

/** Find the logged-in user from the "Bearer mock-access.<id>" header (null if missing/blocked). */
export function currentUser(request: Request): MockUser | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer mock-access\.(.+)$/.exec(header);
  if (!match) return null;
  const user = db.users.find((u) => u.id === match[1]);
  return user && !user.blocked ? user : null;
}
