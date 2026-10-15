import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicEnv } from '@/lib/env';

/**
 * Supabase client for Server Components, server actions and route handlers.
 *
 * Carries the signed-in user's JWT, so Row Level Security applies to every
 * query. This is the DEFAULT client for all tenant data access -- reach for
 * the service-role client in src/lib/supabase/admin.ts only for the narrow
 * operations listed there, because it switches RLS off entirely.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components get a read-only cookie store, so this throws
            // whenever a refreshed token is written during render. Ignoring it
            // is correct: middleware performs the refresh and writes the
            // cookies on a response it owns. Swallowing it here is not the same
            // as losing the session.
          }
        },
      },
    },
  );
}
