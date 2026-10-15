import { z } from 'zod';

/**
 * Public environment variables -- safe to reach the browser.
 *
 * The Supabase URL and anon key are *designed* to be public; Row Level
 * Security is what actually protects tenant data. Nothing secret may be added
 * to this schema. Server-only secrets live in env.server.ts, which is guarded
 * by the `server-only` package.
 *
 * Values are never logged or included in error messages -- only key names and
 * the reason they failed validation (docs/SECURITY.md section 5).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, 'is required')
    .url('must be a valid URL, e.g. http://127.0.0.1:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'is required and looks too short to be a Supabase anon key'),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .min(1, 'is required')
    .url('must be a valid URL, e.g. http://localhost:3000'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Raw shape accepted by the parser. Exported so tests can inject values. */
export type EnvSource = Record<string, string | undefined>;

/**
 * Builds a readable failure message listing only variable NAMES and reasons.
 *
 * Deliberately never interpolates the offending value: a malformed key is
 * still a key, and this message may reach a log aggregator.
 */
function formatEnvFailure(context: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const key = issue.path.join('.') || '(root)';
    return `  - ${key}: ${issue.message}`;
  });

  return [
    `Invalid ${context} environment configuration:`,
    ...lines,
    '',
    'Copy .env.example to .env.local and fill in the values.',
    'For local development run `npm run db:start` and use the printed keys.',
  ].join('\n');
}

/**
 * Pure parser. Exported separately from the memoised accessor so that tests can
 * exercise validation without mutating `process.env`.
 */
export function parsePublicEnv(source: EnvSource): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
  });

  if (!result.success) {
    throw new Error(formatEnvFailure('public', result.error));
  }

  return result.data;
}

let cachedPublicEnv: PublicEnv | null = null;

/**
 * Validated public environment.
 *
 * Resolved lazily and memoised. Lazily, because a module-level throw would
 * make the module impossible to import in a unit test; memoised, because the
 * values cannot change at runtime.
 *
 * Note the literal `process.env.NEXT_PUBLIC_*` reads below -- Next.js inlines
 * these at build time by matching on the literal expression, so they cannot be
 * rewritten as dynamic lookups.
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv === null) {
    cachedPublicEnv = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    });
  }

  return cachedPublicEnv;
}
