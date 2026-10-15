'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FieldError, FormMessage, errorProps } from '@/components/forms/form-parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInAction } from '@/lib/auth/actions';
import { initialAuthFormState } from '@/lib/auth/form-state';

export function SignInForm({ next }: { next?: string | undefined }) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      {/* Sanitised server-side by safeRedirectPath before any redirect. */}
      {next !== undefined && <input type="hidden" name="next" value={next} />}

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...errorProps('password', state.fields)}
        />
        <FieldError id="password-error" message={state.fields.password} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to BillSaathi?{' '}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
