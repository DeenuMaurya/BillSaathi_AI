'use server';

import { redirect } from 'next/navigation';
import { getPublicEnv } from '@/lib/env';
import type { AuthFormState } from '@/lib/auth/form-state';
import { safeRedirectPath } from '@/lib/auth/redirects';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  fieldErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validation/auth';

/**
 * Authentication server actions.
 *
 * Every action re-validates its input with Zod regardless of what the client
 * already checked, because the browser is untrusted (docs/SECURITY.md
 * section 2). Failures return a safe, generic message; details go to the
 * server log only, and never include the submitted email or password.
 *
 * AuthFormState and initialAuthFormState live in ./form-state because a
 * 'use server' module may only export async functions.
 */

/** FormData values are `File | string | null`; normalise to a string. */
function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function validationFailure(fields: Record<string, string>): AuthFormState {
  return { status: 'error', message: 'Please check the fields below.', fields };
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: text(formData, 'fullName'),
    email: text(formData, 'email'),
    password: text(formData, 'password'),
  });

  if (!parsed.success) {
    return validationFailure(fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const env = getPublicEnv();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // The handle_new_user() trigger reads only full_name from this metadata
      // and ignores every other key, so nothing here can grant authority.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error !== null) {
    // Log the code, never the address or password.
    console.error('[auth] sign-up failed', { status: error.status, code: error.code });

    return {
      status: 'error',
      message: 'We could not complete sign-up. Please check your details and try again.',
      fields: {},
    };
  }

  // Deliberately the same destination whether or not the address was already
  // registered. Supabase's enumeration protection returns success for an
  // existing account, and diverging here would undo it.
  redirect('/verify-email');
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const destination = safeRedirectPath(text(formData, 'next'));

  const parsed = signInSchema.safeParse({
    email: text(formData, 'email'),
    password: text(formData, 'password'),
  });

  if (!parsed.success) {
    return validationFailure(fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error !== null) {
    console.error('[auth] sign-in failed', { status: error.status, code: error.code });

    return {
      // One message for every failure mode. "No such user" versus "wrong
      // password" is an account-enumeration oracle, and an unverified-email
      // failure would confirm the address exists too.
      status: 'error',
      message: 'Invalid email or password.',
      fields: {},
    };
  }

  redirect(destination);
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: text(formData, 'email') });

  if (!parsed.success) {
    return validationFailure(fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const env = getPublicEnv();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
  });

  if (error !== null) {
    console.error('[auth] password reset request failed', {
      status: error.status,
      code: error.code,
    });
  }

  // Identical response on success and failure, by design
  // (docs/AUTHENTICATION.md section 10). Telling the visitor that no account
  // exists for an address turns this form into an account-enumeration tool.
  return {
    status: 'success',
    message:
      'If an account exists for that email address, a password reset link is on its way. Check your inbox and spam folder.',
    fields: {},
  };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: text(formData, 'password'),
    confirmPassword: text(formData, 'confirmPassword'),
  });

  if (!parsed.success) {
    return validationFailure(fieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();

  // Succeeds only against the recovery session established by the emailed
  // link, so a visitor without one cannot change anybody's password.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error !== null) {
    console.error('[auth] password update failed', {
      status: error.status,
      code: error.code,
    });

    return {
      status: 'error',
      message:
        'We could not update your password. Your reset link may have expired — request a new one.',
      fields: {},
    };
  }

  redirect('/dashboard');
}
