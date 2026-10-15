import type { Metadata } from 'next';
import { SignInForm } from '@/components/forms/sign-in-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Sign in' };

/** Error codes the callback route may redirect here with. */
const LINK_ERRORS: Record<string, string> = {
  invalid_link: 'That link is invalid or has expired. Request a new one.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  // Only a known code is ever rendered, so the query string cannot be used to
  // inject arbitrary text into the page.
  const linkError =
    params.error === undefined ? undefined : LINK_ERRORS[params.error];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your firm&rsquo;s workspace.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {linkError !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{linkError}</AlertDescription>
          </Alert>
        )}

        <SignInForm next={params.next} />
      </CardContent>
    </Card>
  );
}
