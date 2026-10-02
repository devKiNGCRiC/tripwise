/**
 * safeNext.ts — sanitises the ?next= redirect after login.
 *
 * Without this, a link like /login?next=//evil.com would bounce a freshly
 * logged-in user to a phishing site (an "open redirect"). We only accept
 * same-site absolute paths:
 *  - must start with "/" but not "//" (protocol-relative URL),
 *  - no backslashes or control characters (browsers silently drop tabs/newlines,
 *    so "/\t/evil.com" would otherwise become "//evil.com"),
 *  - and, as a final check, it must resolve to our own origin.
 */

/** True if the string contains ASCII control characters (tab, newline, NUL, DEL…). */
function hasControlChars(value: string): boolean {
  return [...value].some((ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function safeNext(next: string | null | undefined, fallback = '/passport'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || hasControlChars(next)) {
    return fallback;
  }
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
