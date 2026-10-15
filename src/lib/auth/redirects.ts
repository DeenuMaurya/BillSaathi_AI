/**
 * Open-redirect protection for the `?next=` parameter.
 *
 * The sign-in page carries a destination so a user who deep-linked into the app
 * lands where they meant to. That parameter is attacker-controllable, so it has
 * to be constrained to same-origin paths: a crafted
 * `/login?next=https://evil.example` would otherwise bounce a freshly
 * authenticated CA straight onto a phishing page wearing our referrer.
 */

const DEFAULT_DESTINATION = '/dashboard';

/** Longer than any route this app generates; a cheap bound on abuse. */
const MAX_PATH_LENGTH = 512;

export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_DESTINATION,
): string {
  if (next === null || next === undefined || next === '') {
    return fallback;
  }

  if (next.length > MAX_PATH_LENGTH) {
    return fallback;
  }

  // Must be site-relative. This rejects `https://evil.example` and
  // `javascript:...` alike.
  if (!next.startsWith('/')) {
    return fallback;
  }

  // `//evil.example` and `/\evil.example` are both read as protocol-relative
  // URLs by browsers, so they leave the origin despite the leading slash.
  if (next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }

  // Control characters, including the newline and tab that some parsers strip
  // before resolving a URL.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }

  return next;
}
