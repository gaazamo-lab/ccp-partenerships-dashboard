import { Link, Outlet } from 'react-router';

import { Toaster } from '@rfdtech/components';

import { ROUTES } from '@/constants/routes';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to={ROUTES.PUBLIC_HOME} className="flex items-center gap-3" aria-label="CLET consultations home">
            <img src="/clet-logo.png" alt="" width={40} height={40} className="size-10" />
            <span>
              <span className="block text-sm font-bold">CLET</span>
              <span className="block text-xs text-foreground-muted">Public consultation</span>
            </span>
          </Link>
          <Link
            to={ROUTES.ADMIN_HOME}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary"
          >
            Staff access
          </Link>
        </div>
      </header>
      <Outlet />
      <footer className="mt-16 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-foreground-muted sm:flex-row sm:justify-between">
          <p>© 2026 Council for Legal Education and Training</p>
          <p>Responses are handled under Ghana's Data Protection Act, 2012 (Act 843).</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
