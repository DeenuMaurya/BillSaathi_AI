import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

/**
 * Supabase client for Client Components.
 *
 * Uses the anon key only. Every query it issues is subject to Row Level
 * Security, which is what makes it safe to ship to a browser at all.
 */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
