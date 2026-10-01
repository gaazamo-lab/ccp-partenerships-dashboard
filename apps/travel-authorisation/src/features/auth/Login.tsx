import { Link } from 'react-router';

import { LoginScreen } from '@partner-crm/auth';

import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';

export function Component() {
  return (
    <LoginScreen
      tagline="Visa & Travel Authorisation"
      // description="Visa support, official travel approval and GIS liaison for the S084 workspace."
      homePath={ROUTES.HOME}
      defaultEmail={env.authMode === 'mock' ? 'kwame.asante@example.com' : ''}
      defaultPassword={env.authMode === 'mock' ? 'travelauth' : ''}
      footer={
        <>
          Travelling as a student?{' '}
          <Link className="font-semibold text-primary hover:underline" to={ROUTES.STUDENT_HOME}>
            Open the student travel portal
          </Link>
        </>
      }
    />
  );
}
