import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';

import { Button, Notice } from '@rfdtech/components';
import { Loader2, LockKeyhole, SearchX } from 'lucide-react';

import { TextField } from '@partner-crm/ui';

import { MicrositeRenderer } from '@/components/MicrositeRenderer';
import { ROUTES } from '@/constants/routes';
import { errorMessage } from '@/features/microsites/errors';
import { usePublicMicrosite } from '@/features/public/usePublicMicrosites';

function CenteredPanel({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:py-24">
      {children}
    </section>
  );
}

function UnlockForm({ onUnlock }: { onUnlock: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setError('Enter the access code from your invitation.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onUnlock(code.trim());
    } catch (reason) {
      setError(errorMessage(reason, 'That access code could not be checked. Try again.'));
      setSubmitting(false);
    }
  };

  return (
    <CenteredPanel>
      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
        <LockKeyhole size={26} aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">This report is private</h1>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">
        It was prepared for a named group of donors and Board members. Enter the access code from your invitation
        to continue.
      </p>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="mt-6 w-full space-y-4 text-left">
        <TextField
          label="Access code"
          type="password"
          autoComplete="off"
          required
          autoFocus
          value={code}
          onChange={(value) => {
            setCode(value);
            if (error) setError(null);
          }}
          error={error ?? undefined}
        />
        <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
          Unlock report
        </Button>
      </form>
      <p className="mt-6 text-xs text-foreground-muted">
        No code? Contact the CLET partnerships team at partnerships@clet.gov.gh.
      </p>
    </CenteredPanel>
  );
}

export function Component() {
  const { slug = '' } = useParams();
  const { state, unlock } = usePublicMicrosite(slug);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-foreground-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden /> Loading…
      </div>
    );
  }

  if (state.status === 'locked') return <UnlockForm onUnlock={unlock} />;

  if (state.status === 'not-found') {
    return (
      <CenteredPanel>
        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <SearchX size={26} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">This page is not available</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          The link may be out of date, or the microsite may no longer be published.
        </p>
        <Link to={ROUTES.PUBLIC_HOME} className="mt-6">
          <Button variant="outline">See all published microsites</Button>
        </Link>
      </CenteredPanel>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16">
        <Notice variant="error" title="This microsite could not be loaded" leftBorder>
          {state.message} Refresh the page to try again.
        </Notice>
      </section>
    );
  }

  return <MicrositeRenderer site={state.site} />;
}
