import { Link } from 'react-router';

import { Button } from '@rfdtech/components';

import { ROUTES } from '@/constants/routes';

export function Component() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page does not exist</h1>
      <p className="max-w-md text-sm text-foreground-muted">
        The link may be out of date, or the record may have been removed.
      </p>
      <Link to={ROUTES.PUBLIC_HOME}>
        <Button variant="outline">Back to the workspace</Button>
      </Link>
    </main>
  );
}
