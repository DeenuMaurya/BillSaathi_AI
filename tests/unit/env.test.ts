import { describe, expect, it } from 'vitest';
import { parsePublicEnv } from '@/lib/env';

/**
 * These tests exercise the pure parser rather than process.env, so they verify
 * the failure behaviour without mutating global state.
 *
 * env.server.ts is deliberately NOT imported here: it imports `server-only`,
 * which throws outside a server bundle. That is the guarantee working as
 * intended, and it is checked by `tsc` and the build rather than at runtime.
 */

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(40),
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
};

describe('parsePublicEnv', () => {
  it('accepts a complete configuration', () => {
    expect(parsePublicEnv(VALID)).toEqual(VALID);
  });

  it('fails when a variable is missing', () => {
    const { NEXT_PUBLIC_SUPABASE_URL: _omitted, ...incomplete } = VALID;
    expect(() => parsePublicEnv(incomplete)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('names every missing variable at once', () => {
    try {
      parsePublicEnv({});
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(message).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(message).toContain('NEXT_PUBLIC_SITE_URL');
    }
  });

  it('rejects a malformed URL', () => {
    expect(() =>
      parsePublicEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' }),
    ).toThrow(/must be a valid URL/);
  });

  it('rejects an implausibly short anon key', () => {
    expect(() =>
      parsePublicEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'abc' }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('never echoes a variable’s value into the error message', () => {
    // docs/SECURITY.md section 5: do not log secrets or print environment
    // values. A malformed key is still a key, and this message may reach a log
    // aggregator.
    const secretish = 'eyJhbGciOiJIUzI1NiRECOGNISABLE_SECRET';

    try {
      parsePublicEnv({
        ...VALID,
        NEXT_PUBLIC_SUPABASE_URL: secretish,
      });
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(secretish);
      expect(message).not.toContain('RECOGNISABLE_SECRET');
      // It should still say which variable was wrong.
      expect(message).toContain('NEXT_PUBLIC_SUPABASE_URL');
    }
  });

  it('points the reader at the setup steps', () => {
    try {
      parsePublicEnv({});
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as Error).message).toContain('.env.example');
      expect((error as Error).message).toContain('db:start');
    }
  });
});
