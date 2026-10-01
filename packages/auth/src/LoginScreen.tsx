import { type FormEvent, type ReactNode, useEffect, useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  Button,
  Field,
  FieldControl,
  FieldError,
  FieldLabel,
  Input,
  Notice,
} from '@rfdtech/components';

import './LoginScreen.css';
import { useAuth } from './useAuth';

interface LoginLocationState {
  from?: string;
}

interface LoginScreenProps {
  /** Small caps label over the hero image. */
  eyebrow?: string;
  /** Big heading over the hero image. */
  tagline: string;
  /** Heading above the sign-in form. */
  heading?: string;
  description?: string;
  /** Where to go after sign-in when the user did not arrive from a protected page. */
  homePath?: string;
  /** Prefills the form; only ever set for local preview builds. */
  defaultEmail?: string;
  defaultPassword?: string;
  /**
   * Optional secondary route shown under the form, e.g. a link to a separate
   * self-service portal. Keep it to one short line.
   */
  footer?: ReactNode;
}

const MIN_PASSWORD_LENGTH = 8;

type LoginErrors = Partial<Record<'email' | 'password', string>>;

function validate(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = 'Enter a valid email address.';
  if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Passwords are at least ${MIN_PASSWORD_LENGTH} characters.`;
  return errors;
}

/**
 * The CLET sign-in page: hero imagery on the left, email and password on the
 * right. Every app renders this so the front door looks the same everywhere.
 * Consuming apps must ship `/clet-logo.png` and `/login-hero.avif` in `public/`.
 */
export function LoginScreen({
  eyebrow = 'CLET · CCP Directorate',
  tagline,
  heading = 'Sign in to your account',
  description,
  homePath = '/',
  defaultEmail = '',
  defaultPassword = '',
  footer,
}: LoginScreenProps) {
  const { ready, signIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [failure, setFailure] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const destination = (location.state as LoginLocationState | null)?.from ?? homePath;

  useEffect(() => {
    if (ready && user) void navigate(destination, { replace: true });
  }, [destination, navigate, ready, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailure('');
    const found = validate(email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      void navigate(destination, { replace: true });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pcrm-landing">
      <div className="pcrm-landing__media" aria-hidden>
        <div className="pcrm-landing__caption">
          <p className="pcrm-landing__eyebrow">{eyebrow}</p>
          <p className="pcrm-landing__title">{tagline}</p>
        </div>
      </div>

      <main className="pcrm-landing__panel">
        <div className="pcrm-landing__content">
          <img className="pcrm-landing__logo" src="/clet-logo.png" alt="CLET" />
          <h1 className="pcrm-landing__heading">{heading}</h1>
          {description ? <p className="pcrm-landing__desc">{description}</p> : null}

          <form
            className="flex w-full flex-col gap-5"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            {failure ? (
              <Notice variant="error" title="Sign in failed">
                {failure}
              </Notice>
            ) : null}

            <Field invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor={emailId}>Email</FieldLabel>
              <FieldControl>
                <Input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  invalid={Boolean(errors.email)}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors((current) => ({ ...current, email: undefined }));
                  }}
                />
              </FieldControl>
              {errors.email ? <FieldError>{errors.email}</FieldError> : null}
            </Field>

            <Field invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
              <FieldControl>
                <Input
                  id={passwordId}
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  invalid={Boolean(errors.password)}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({ ...current, password: undefined }));
                  }}
                />
              </FieldControl>
              {errors.password ? <FieldError>{errors.password}</FieldError> : null}
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="pcrm-landing__signin w-full"
              loading={submitting}
              disabled={!ready}
            >
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          {footer ? <div className="pcrm-landing__footer">{footer}</div> : null}

          <p className="pcrm-landing__note">
            Access is restricted to authorised CLET staff. Activity is logged.
          </p>
        </div>
      </main>
    </div>
  );
}
