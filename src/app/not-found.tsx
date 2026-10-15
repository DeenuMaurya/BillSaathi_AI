import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        That page does not exist, or you do not have access to it.
      </p>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
        Back to dashboard
      </Link>
    </main>
  );
}
