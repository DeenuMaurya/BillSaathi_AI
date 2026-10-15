import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Signs the user out.
 *
 * POST only, deliberately. A GET sign-out can be triggered by any third-party
 * page embedding `<img src="/auth/sign-out">`, which is a small but real
 * cross-site nuisance; requiring a form POST means the request has to come
 * from our own page.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signOut();

  if (error !== null) {
    console.error('[auth] sign-out failed', { status: error.status, code: error.code });
  }

  // Redirect either way: if the session is already gone, the user is signed out
  // regardless, and leaving them on an error page would be worse.
  return NextResponse.redirect(new URL('/login', request.nextUrl.origin));
}
