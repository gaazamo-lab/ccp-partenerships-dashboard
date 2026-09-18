import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Field,
  FieldControl,
  FieldLabel,
  Input,
  Notice,
} from '@rfdtech/components';
import { Handshake } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { ROUTES } from '@/constants/routes';

interface LoginLocationState {
  from?: string;
}

export function Component() {
  const { ready, signIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('partner@example.com');
  const [password, setPassword] = useState('partnercrm');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const destination = (location.state as LoginLocationState | null)?.from ?? ROUTES.HOME;

  useEffect(() => {
    if (ready && user) void navigate(destination, { replace: true });
  }, [destination, navigate, ready, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn({ email, password });
      void navigate(destination, { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Handshake size={26} strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Partner CRM</h1>
            <p className="text-sm text-foreground-muted">Sign in to your relationship workspace.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
          </CardHeader>

          <form className="flex flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
            {error ? <Notice variant="error">{error}</Notice> : null}

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <FieldControl>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </FieldControl>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <FieldControl>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </FieldControl>
            </Field>

            <Button type="submit" variant="primary" disabled={!ready || submitting}>
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
