import { useNavigate } from 'react-router';

import { Button } from '@rfdtech/components';

import { ROUTES } from '@/constants/routes';

export function Component() {
  const navigate = useNavigate();
  return (
    <main className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-foreground-muted">
          The page you requested is not part of this workspace.
        </p>
        <Button className="mt-6" onClick={() => navigate(ROUTES.HOME)}>
          Return to overview
        </Button>
      </div>
    </main>
  );
}
