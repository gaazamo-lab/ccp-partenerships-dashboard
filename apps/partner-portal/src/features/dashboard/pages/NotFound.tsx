import { useNavigate } from 'react-router';

import { Button, Notice } from '@rfdtech/components';

import { ROUTES } from '@/constants/routes';

export function Component() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <Notice variant="warning" title="Page not found" leftBorder>
          The page you requested is not part of Partner CRM.
        </Notice>
        <Button variant="primary" onClick={() => void navigate(ROUTES.HOME)}>
          Return to overview
        </Button>
      </div>
    </main>
  );
}
