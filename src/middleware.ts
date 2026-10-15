import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Session refresh plus a first-pass route redirect.
 *
 * NOT a security boundary -- see the note on requireUser() in
 * src/lib/auth/session.ts. Its jobs are to keep the access token fresh and to
 * avoid rendering an app shell to someone who is signed out.
 */

/** Reachable without a session. */
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  // Arrived at from an emailed recovery link. The visitor technically holds a
  // recovery session, so this must stay reachable while "authenticated".
  '/reset-password',
  '/verify-email',
  // Code exchange and sign-out endpoints.
  '/auth',
];

/** Pointless for a signed-in user; bounce them to the app. */
const REDIRECT_IF_AUTHENTICATED = ['/login', '/register', '/forgot-password'];

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = pathname === '/' || matchesPrefix(pathname, PUBLIC_PREFIXES);

  if (user === null && !isPublic) {
    const signInUrl = new URL('/login', request.url);
    // Preserve the intended destination. Only the path and query are carried
    // over, never a caller-supplied absolute URL, so this cannot be turned into
    // an open redirect to another origin.
    signInUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(signInUrl);
  }

  if (user !== null && matchesPrefix(pathname, REDIRECT_IF_AUTHENTICATED)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  // Skip static assets and image optimisation; everything else refreshes.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
