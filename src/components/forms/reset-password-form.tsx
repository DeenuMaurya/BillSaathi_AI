'use client';

import { useActionState } from 'react';
import { FieldError, FormMessage, errorProps } from '@/components/forms/form-parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordAction } from '@/lib/auth/actions';
import { initialAuthFormState } from '@/lib/auth/form-state';

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
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
          At least 10 characters.
        </p>
        <FieldError id="password-error" message={state.fields.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          {...errorProps('confirmPassword', state.fields)}
        />
        <FieldError id="confirmPassword-error" message={state.fields.confirmPassword} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
