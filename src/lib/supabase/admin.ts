// This module is reachable from server code only. The service-role key must
// never be bundled for a browser.
import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';
import { getServerEnv } from '@/lib/env.server';

/**
 * Service-role Supabase client.
 *
 * ============================ READ BEFORE USING ============================
 *
 * This client BYPASSES ROW LEVEL SECURITY. Every query it makes can read and
 * write every row of every tenant. When you use it, the database safety net is
 * gone and your own server-side authorization checks are the ONLY thing
 * standing between one CA firm and another firm's client data.
 *
 * ALLOWLIST -- the only operations permitted to use this client:
 *
 *   1. Private Storage reads/writes and signed-URL minting, AFTER the caller's
 *      access to the owning client has been verified. Browsers are granted no
 *      direct storage access at all (docs/SECURITY.md section 4), so uploads
 *      and downloads must be brokered server-side.
 *   2. Appending to audit_logs, which revokes INSERT from `authenticated` so
 *      that users cannot forge or suppress their own audit trail.
 *   3. Looking up an invitation by token hash before the invitee has a session
 *      -- there is no user JWT yet, so RLS has no identity to filter on.
 *
 * Anything not on this list must use createSupabaseServerClient() instead.
 *
 * The ESLint rule `no-restricted-imports` blocks importing this module. When an
 * allowlisted call site needs it, disable the rule inline with a one-line
 * justification naming the allowlist entry, so the exception shows up in review.
 * ===========================================================================
 */

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (cachedAdminClient === null) {
    const publicEnv = getPublicEnv();
    const serverEnv = getServerEnv();

    cachedAdminClient = createClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          // This client represents no user and must never pick one up. Leaving
          // session persistence on risks it adopting a cookie-derived identity
          // and quietly behaving as a signed-in user with RLS disabled.
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return cachedAdminClient;
}
