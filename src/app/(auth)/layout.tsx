/**
 * Shell for the unauthenticated pages.
 *
 * Centred single column at every breakpoint, so it holds up from a 375px phone
 * to a desktop without a separate mobile layout.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight">BillSaathi AI</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Invoice and reconciliation workflow for CA firms
            </p>
          </div>

          {children}
        </div>
      </main>

      <footer className="px-4 pb-6">
        <p className="mx-auto max-w-md text-center text-xs text-muted-foreground">
          BillSaathi AI assists with document workflow and reconciliation. It does not
          provide tax advice or certify GST compliance.
        </p>
      </footer>
    </div>
  );
}
