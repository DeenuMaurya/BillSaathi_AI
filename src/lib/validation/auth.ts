import { z } from 'zod';

/**
 * Validation schemas for authentication forms.
 *
 * Used on the server in every case. Client-side reuse is for responsiveness
 * only; the server re-validates (docs/SECURITY.md section 2: the browser is
 * untrusted).
 */

/** RFC 5321 caps an address at 254 characters. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.');

/**
 * Password policy.
 *
 * The 72-character ceiling is not arbitrary: Supabase Auth hashes with bcrypt,
 * which silently truncates input beyond 72 bytes. Without this cap a user could
 * set a 100-character passphrase and find that only the first 72 bytes are
 * actually required to sign in -- a false sense of strength. Rejecting it
 * outright is more honest than quietly ignoring the remainder.
 *
 * The 10-character floor must stay in step with the minimum length configured
 * in the Supabase dashboard; the dashboard setting is the authoritative one.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .max(72, 'Password must be 72 characters or fewer.');

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  // Matches the profiles_full_name_length CHECK constraint in migration 0002.
  .max(120, 'Name must be 120 characters or fewer.');

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Sign-in deliberately does NOT reuse passwordSchema.
 *
 * Applying the length rules here would let an attacker distinguish "this
 * password is too short to be valid" from "these credentials are wrong", and
 * would lock out users whose password predates a policy change. Presence is the
 * only client-side requirement; Supabase decides whether it is correct.
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Flattens a ZodError into a field -> first-message map for form rendering.
 *
 * Only the first message per field is kept: showing a stack of simultaneous
 * complaints about one input is noise.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (result[key] === undefined) {
      result[key] = issue.message;
    }
  }

  return result;
}
