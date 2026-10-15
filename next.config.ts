import type { NextConfig } from 'next';

/**
 * Baseline security headers.
 *
 * A Content-Security-Policy is deliberately NOT set here yet: Next.js injects
 * inline scripts for hydration, so a correct CSP needs per-request nonces via
 * middleware. Adding a nonce-based CSP is tracked for the deployment milestone
 * rather than shipped half-broken now.
 *
 * See docs/SECURITY.md section 5.
 */
const securityHeaders = [
  // Clickjacking: this app is never meant to be framed.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers guessing content types on downloads/previews.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Do not leak document URLs (which contain record UUIDs) to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No feature of this app needs these.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Only meaningful over HTTPS; ignored by browsers on plain http://localhost.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework version.
  poweredByHeader: false,

  // Fail the production build on type or lint errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
