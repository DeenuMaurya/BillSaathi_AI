'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '@/components/layout/nav-items';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const content = (
    <>
      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </>
  );

  if (!item.available) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
        // Communicates unavailability to assistive technology, not just visually.
        aria-disabled="true"
      >
        {content}
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {content}
    </Link>
  );
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
        />
      ))}
    </nav>
  );
}

function SignOutButton() {
  return (
    // POST, so the action cannot be triggered by a third-party page embedding
    // an image or link pointing at it.
    <form action="/auth/sign-out" method="post">
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-3">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </Button>
    </form>
  );
}

function AccountPanel({ email }: { email: string }) {
  return (
    <div className="border-t p-3">
      <p className="px-3 pb-2 text-xs text-muted-foreground">
        Signed in as
        <br />
        <span className="font-medium text-foreground">{email}</span>
      </p>
      <SignOutButton />
    </div>
  );
}

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close the drawer on navigation, so following a link does not leave it
  // covering the page it just opened.
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  // Escape closes the drawer -- expected of any overlay, and the only way out
  // for a keyboard user if the trigger has scrolled off screen.
  useEffect(() => {
    if (!isMobileNavOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMobileNavOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileNavOpen]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r bg-muted/20 lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b px-6">
          <span className="font-semibold tracking-tight">BillSaathi AI</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>

        <AccountPanel email={email} />
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-nav"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <span className="font-semibold tracking-tight">BillSaathi AI</span>
        </header>

        {/* Mobile drawer */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation menu"
            />

            <div
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-background shadow-xl"
            >
              <div className="flex h-14 items-center justify-between border-b px-4">
                <span className="font-semibold tracking-tight">BillSaathi AI</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileNavOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <NavList pathname={pathname} />
              </div>

              <AccountPanel email={email} />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
