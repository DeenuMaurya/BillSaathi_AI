import type { Metadata } from 'next';
import { SignUpForm } from '@/components/forms/sign-up-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          You will set up your firm workspace after verifying your email.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <SignUpForm />
      </CardContent>
    </Card>
  );
}
