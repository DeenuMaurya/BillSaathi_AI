import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

/**
 * Refreshes the Supabase session on every matched request and reports who the
 * caller is.
 *
 * Without this, an access token expires mid-session and Server Components start
 * seeing a signed-out user even though the refresh token is still valid.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies onto the request so that anything later in
          // this same request sees the new token, then rebuild the response so
          // they also reach the browser. Both halves are required.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser(), never getSession().
  //
  // getSession() decodes the JWT straight out of the cookie and trusts it,
  // which means a tampered or revoked token still looks valid here. getUser()
  // revalidates against the Auth server, so a user whose membership was
  // suspended or whose session was revoked stops being authenticated promptly
  // (docs/SECURITY.md section 3).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
