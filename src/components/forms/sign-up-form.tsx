'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FieldError, FormMessage, errorProps } from '@/components/forms/form-parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpAction } from '@/lib/auth/actions';
import { initialAuthFormState } from '@/lib/auth/form-state';

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="Priya Sharma"
          {...errorProps('fullName', state.fields)}
        />
        <FieldError id="fullName-error" message={state.fields.fullName} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={72}
          aria-describedby={
            state.fields.password === undefined ? 'password-hint' : 'password-error'
          }
          aria-invalid={state.fields.password === undefined ? undefined : true}
        />
        <p id="password-hint" className="text-sm text-muted-foreground">
          At least 10 characters. A passphrase of a few unrelated words works well.
        </p>
        <FieldError id="password-error" message={state.fields.password} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
