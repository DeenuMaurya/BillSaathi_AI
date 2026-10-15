'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FieldError, FormMessage, errorProps } from '@/components/forms/form-parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPasswordAction } from '@/lib/auth/actions';
import { initialAuthFormState } from '@/lib/auth/form-state';

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialAuthFormState,
  );

  // The action returns the same confirmation whether or not the address is
  // registered, so the form is replaced by that message rather than inviting
  // a retry that would reveal nothing new.
  if (state.status === 'success') {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@firm.in"
          {...errorProps('email', state.fields)}
        />
        <FieldError id="email-error" message={state.fields.email} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
