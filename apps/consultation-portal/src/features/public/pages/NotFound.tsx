import { Link } from 'react-router';

import { Notice } from '@rfdtech/components';

import { ROUTES } from '@/constants/routes';

export function Component() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-20">
      <Notice variant="warning" title="Page not found" leftBorder>
        The page you requested is not available.
      </Notice>
      <Link to={ROUTES.PUBLIC_HOME} className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
        Return home
      </Link>
    </main>
  );
}
