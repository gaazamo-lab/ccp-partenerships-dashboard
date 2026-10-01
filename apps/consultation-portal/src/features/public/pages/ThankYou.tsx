import { Link, useLocation } from 'react-router';

import { Card } from '@rfdtech/components';
import { CheckCircle2 } from 'lucide-react';

import { ROUTES } from '@/constants/routes';

export function Component() {
  const { state } = useLocation();
  const title = (state as { title?: string } | null)?.title;
  return (
    <main className="mx-auto max-w-2xl px-5 py-20 text-center">
      <Card bordered>
        <CheckCircle2 className="mx-auto text-success" size={52} aria-hidden />
        <h1 className="mt-5 text-3xl font-semibold">Thank you for taking part</h1>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-foreground-muted">
          Your response{title ? ` to “${title}”` : ''} has been recorded. It will be reviewed with other responses and
          reported in aggregate. When the consultation closes, CLET publishes what we heard on the consultation page.
        </p>
        <Link to={ROUTES.PUBLIC_HOME} className="mt-7 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          View other consultations
        </Link>
      </Card>
    </main>
  );
}
