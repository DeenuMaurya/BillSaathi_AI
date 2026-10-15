import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Returns the signed-in user, or null.
 *
 * Uses getUser(), which revalidates the token against the Auth server rather
 * than trusting the cookie -- see the note in src/lib/supabase/middleware.ts.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Requires a signed-in user, redirecting to sign-in otherwise.
 *
 * This is the REAL access control for protected pages. The middleware
 * redirect is a usability affordance that keeps unauthenticated users from
 * seeing a flash of app shell -- it is not a security boundary, because
 * middleware can be bypassed by matcher gaps and does not run for every
 * server action. docs/SECURITY.md section 3 is explicit that frontend route
 * guards do not count as controls, so every protected layout, page, action and
 * route handler calls this directly.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (user === null) {
    redirect('/login');
  }

  return user;
}
