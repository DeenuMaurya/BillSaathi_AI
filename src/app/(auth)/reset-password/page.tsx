import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/forms/reset-password-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Set new password' };

/**
 * Reached from an emailed recovery link, after /auth/callback has exchanged the
 * code for a recovery session. The update itself fails without that session,
 * so visiting this page directly cannot change anyone's password.
 */
export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Choose a new password for your account. You will stay signed in on this device.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
