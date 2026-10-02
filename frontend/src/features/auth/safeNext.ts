/**
 * safeNext.ts — sanitises the ?next= redirect after login.
 *
 * Without this, a link like /login?next=//evil.com would bounce a freshly
 * logged-in user to a phishing site (an "open redirect"). We only accept
 * same-site absolute paths: they start with "/" but not "//" or "/\".
 */
export function safeNext(next: string | null | undefined, fallback = '/passport'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
