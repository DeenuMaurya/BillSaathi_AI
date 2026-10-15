import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  fieldErrors,
  forgotPasswordSchema,
  fullNameSchema,
  passwordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validation/auth';

describe('emailSchema', () => {
  it('normalises case and whitespace', () => {
    // Normalising at the schema means lookups and uniqueness are consistent.
    expect(emailSchema.parse('  Priya@Example.COM  ')).toBe('priya@example.com');
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'not-an-email', 'a@', '@b.com', 'a b@c.com']) {
      expect(emailSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('rejects an address longer than RFC 5321 allows', () => {
    const tooLong = `${'a'.repeat(250)}@example.com`;
    expect(emailSchema.safeParse(tooLong).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('requires at least ten characters', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(10)).success).toBe(true);
  });

  it('rejects a password beyond bcrypt’s 72-byte limit', () => {
    // Supabase hashes with bcrypt, which truncates past 72 bytes. Accepting a
    // longer passphrase would mean only the first 72 bytes are needed to sign
    // in, giving the user a false sense of strength.
    expect(passwordSchema.safeParse('a'.repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(73)).success).toBe(false);
  });
});

describe('fullNameSchema', () => {
  it('trims surrounding whitespace', () => {
    expect(fullNameSchema.parse('  Priya Sharma  ')).toBe('Priya Sharma');
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(fullNameSchema.safeParse('').success).toBe(false);
    expect(fullNameSchema.safeParse('    ').success).toBe(false);
  });

  it('caps length at the database constraint', () => {
    // Must match profiles_full_name_length in migration 0002.
    expect(fullNameSchema.safeParse('a'.repeat(120)).success).toBe(true);
    expect(fullNameSchema.safeParse('a'.repeat(121)).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  it('accepts a valid registration', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Priya Sharma',
      email: 'Priya@Example.com',
      password: 'correct-horse-battery',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('priya@example.com');
    }
  });

  it('ignores extra fields a browser might inject', () => {
    // A forged role or organization_id in the payload must not survive
    // parsing (docs/SECURITY.md section 2).
    const result = signUpSchema.parse({
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      password: 'correct-horse-battery',
      role: 'owner',
      organization_id: '00000000-0000-0000-0000-000000000000',
    } as never);

    expect(result).not.toHaveProperty('role');
    expect(result).not.toHaveProperty('organization_id');
    expect(Object.keys(result).sort()).toEqual(['email', 'fullName', 'password']);
  });
});

describe('signInSchema', () => {
  it('requires only that a password be present', () => {
    // Applying length rules here would distinguish "too short to be valid"
    // from "wrong credentials", and would lock out users whose password
    // predates a policy change.
    expect(
      signInSchema.safeParse({ email: 'priya@example.com', password: 'short' }).success,
    ).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(
      signInSchema.safeParse({ email: 'priya@example.com', password: '' }).success,
    ).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'priya@example.com' }).success).toBe(
      true,
    );
  });
});

describe('resetPasswordSchema', () => {
  it('accepts matching passwords', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'correct-horse-battery',
        confirmPassword: 'correct-horse-battery',
      }).success,
    ).toBe(true);
  });

  it('reports a mismatch against the confirm field', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'correct-horse-battery',
      confirmPassword: 'something-else-here',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        confirmPassword: 'Passwords do not match.',
      });
    }
  });
});

describe('fieldErrors', () => {
  it('keeps the first message per field', () => {
    const result = signUpSchema.safeParse({ fullName: '', email: 'bad', password: 'x' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password']);
      for (const message of Object.values(errors)) {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    }
  });
});
