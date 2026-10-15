import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/auth/redirects';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Exchanges an emailed one-time code for a session.
 *
 * Handles both email-verification and password-recovery links. Supabase sends
 * the visitor here with `?code=...`; the code is single-use and short-lived.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const linkType = searchParams.get('type');
  const destination = safeRedirectPath(searchParams.get('next'));

  if (code === null) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    console.error('[auth] code exchange failed', {
      status: error.status,
      code: error.code,
    });

    // Expired, already-used and forged codes are reported identically.
    return NextResponse.redirect(new URL('/login?error=invalid_link', origin));
  }

  // A recovery link grants a session whose only purpose is setting a new
  // password, so send it to that form rather than into the app.
  if (linkType === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', origin));
  }

  return NextResponse.redirect(new URL(destination, origin));
}
