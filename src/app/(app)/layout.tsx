import { AppShell } from '@/components/layout/app-shell';
import { requireUser } from '@/lib/auth/session';

/**
 * Layout for every authenticated route.
 *
 * requireUser() here is the REAL gate, not the middleware redirect. Layouts run
 * on the server for every request in this segment, so a request that reaches a
 * page beneath it has had its session validated against the Auth server
 * (docs/SECURITY.md section 3: frontend route guards are not security controls).
 *
 * Each page and server action still performs its own authorization checks --
 * this establishes identity, not permission.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return <AppShell email={user.email ?? 'Unknown account'}>{children}</AppShell>;
}
