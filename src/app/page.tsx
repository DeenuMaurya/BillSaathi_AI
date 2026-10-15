import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Root route. No marketing page exists yet, so this just routes the visitor to
 * wherever they actually belong.
 */
export default async function RootPage() {
  const user = await getCurrentUser();

  redirect(user === null ? '/login' : '/dashboard');
}
