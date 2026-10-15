import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Dashboard placeholder.
 *
 * Shows ONLY real session and profile data. docs/APP_FLOW.md section 2 calls
 * for pending-work counts here, but documents, invoices and reconciliation do
 * not exist until later milestones -- rendering plausible-looking zeroes or
 * sample figures would misrepresent an empty system as a working one. The
 * profile read doubles as a live check that the handle_new_user() trigger from
 * migration 0002 fired.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  // Subject to RLS: the policy in 0002 permits reading only the caller's own
  // row, so this returns at most one record no matter what.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error !== null) {
    console.error('[dashboard] profile read failed', { code: error.code });
  }

  const displayName = profile?.full_name ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {displayName === null ? 'Welcome' : `Welcome, ${displayName}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is set up. The firm workspace comes next.
        </p>
      </div>

      <Alert variant="warning">
        <AlertTitle>Milestone 1 of 10 complete</AlertTitle>
        <AlertDescription>
          <p className="mt-1">
            Authentication works. Organizations, clients, document upload, invoice
            extraction and reconciliation are not built yet, so the navigation items for
            them are marked &ldquo;Soon&rdquo; rather than linking anywhere. No invoice or
            bank data exists in this system.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Read from your Supabase session and profile record.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </dt>
              <dd className="mt-1 break-all text-sm">{user.email ?? 'Not available'}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email verified
              </dt>
              <dd className="mt-1 text-sm">
                {user.email_confirmed_at == null ? 'Not verified' : 'Verified'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Name on profile
              </dt>
              <dd className="mt-1 text-sm">
                {displayName ?? 'Not set'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                User ID
              </dt>
              <dd className="tabular mt-1 break-all text-xs">{user.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next step</CardTitle>
          <CardDescription>Milestone 2 — organizations and team membership</CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Creating a firm workspace, inviting staff with roles, and the invitation flow
            are the next milestone. Until then this account belongs to no organization, so
            there is nothing to scope clients or documents to.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
