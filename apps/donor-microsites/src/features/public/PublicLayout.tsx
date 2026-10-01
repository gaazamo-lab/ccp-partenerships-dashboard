import { Link, Outlet } from 'react-router';

import { Toaster } from '@rfdtech/components';

import { ROUTES } from '@/constants/routes';

/** Chrome for the visitor-facing pages: CLET header, content, footer. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to={ROUTES.PUBLIC_HOME} className="flex min-w-0 items-center gap-3">
            <img src="/clet-logo.png" alt="" width={36} height={36} className="shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                Council for Legal Education and Training
              </span>
              <span className="block truncate text-xs text-foreground-muted">Reports, impact and campaigns</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface-subtle">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 Council for Legal Education and Training</span>
          <Link to={ROUTES.PUBLIC_HOME} className="hover:text-foreground">
            All published microsites
          </Link>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
