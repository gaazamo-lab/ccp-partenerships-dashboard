import { useNavigate } from 'react-router';

import { Button, Card } from '@rfdtech/components';
import { Compass } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { EmptyState } from '@/features/shared';

export function Component() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card bordered className="w-full max-w-lg">
        <EmptyState
          message="This page isn't part of Partner CRM"
          hint="The link may be out of date, or the address may have a typo."
          icon={<Compass size={22} aria-hidden />}
          action={
            <Button variant="primary" onClick={() => void navigate(ROUTES.HOME)}>
              Return to overview
            </Button>
          }
        />
      </Card>
    </main>
  );
}
