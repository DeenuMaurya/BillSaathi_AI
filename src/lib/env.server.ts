// The `server-only` package (bundled with Next.js) makes this module a BUILD
// ERROR if it is ever imported from a Client Component. That compile-time
// guarantee is the enforcement mechanism behind docs/SECURITY.md section 5:
// "Never expose service-role keys or AI provider secrets through NEXT_PUBLIC_
// variables." A reviewer does not have to notice the mistake -- the build fails.
import 'server-only';

import { z } from 'zod';
import type { EnvSource } from './env';

/**
 * Server-only secrets. Nothing here may ever be prefixed with NEXT_PUBLIC_.
 */
const serverEnvSchema = z.object({
  /**
   * Bypasses Row Level Security completely. See src/lib/supabase/admin.ts for
   * the allowlist of operations permitted to use it.
   */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'is required and looks too short to be a Supabase service-role key'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatEnvFailure(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const key = issue.path.join('.') || '(root)';
    return `  - ${key}: ${issue.message}`;
  });

  return [
    'Invalid server environment configuration:',
    ...lines,
    '',
    'Copy .env.example to .env.local and fill in the values.',
    'For local development run `npm run db:start` and use the printed keys.',
  ].join('\n');
}

/** Pure parser, exported for tests. Never logs or echoes a value. */
export function parseServerEnv(source: EnvSource): ServerEnv {
  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    throw new Error(formatEnvFailure(result.error));
  }

  return result.data;
}

let cachedServerEnv: ServerEnv | null = null;

/** Validated server environment. Lazy and memoised; see getPublicEnv(). */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv === null) {
    cachedServerEnv = parseServerEnv({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  return cachedServerEnv;
}
