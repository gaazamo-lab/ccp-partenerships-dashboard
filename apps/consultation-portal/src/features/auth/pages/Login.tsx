import { LoginScreen } from '@partner-crm/auth';

import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';

export function Component() {
  return (
    <LoginScreen
      tagline="Public Survey & Consultation Platform"
      // description="Build consultations, reach consent-verified audiences and publish what CLET heard."
      homePath={ROUTES.ADMIN_HOME}
      defaultEmail={env.authMode === 'mock' ? 'consultations@clet.gov.gh' : ''}
      defaultPassword={env.authMode === 'mock' ? 'preview-pass' : ''}
    />
  );
}
