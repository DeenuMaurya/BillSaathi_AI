import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '@/lib/auth/redirects';

describe('safeRedirectPath', () => {
  it('allows a site-relative path', () => {
    expect(safeRedirectPath('/invoices')).toBe('/invoices');
    expect(safeRedirectPath('/clients/123?tab=documents')).toBe(
      '/clients/123?tab=documents',
    );
  });

  it('falls back when absent', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
  });

  it('honours a custom fallback', () => {
    expect(safeRedirectPath(null, '/onboarding')).toBe('/onboarding');
  });

  it('rejects absolute URLs on another origin', () => {
    for (const hostile of [
      'https://evil.example',
      'http://evil.example/login',
      '//evil.example',
      '/\\evil.example',
      '/\\/evil.example',
    ]) {
      expect(safeRedirectPath(hostile)).toBe('/dashboard');
    }
  });

  it('rejects non-http schemes', () => {
    for (const hostile of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ]) {
      expect(safeRedirectPath(hostile)).toBe('/dashboard');
    }
  });

  it('rejects embedded control characters', () => {
    // Some URL parsers strip these before resolving, which can turn a
    // seemingly relative path into an absolute one.
    expect(safeRedirectPath('/\n//evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('/\t/evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('/path\u0000')).toBe('/dashboard');
  });

  it('rejects an over-long path', () => {
    expect(safeRedirectPath(`/${'a'.repeat(600)}`)).toBe('/dashboard');
  });
});
