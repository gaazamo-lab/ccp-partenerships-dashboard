import { LoginScreen } from '@partner-crm/auth';

import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';

export function Component() {
  return (
    <LoginScreen
      tagline="Donor & Annual-Report Microsites"
      // description="Build, approve and publish donor impact reports and campaign microsites."
      homePath={ROUTES.ADMIN}
      defaultEmail={env.authMode === 'mock' ? 'officer@clet.gov.gh' : ''}
      defaultPassword={env.authMode === 'mock' ? 'preview-pass' : ''}
    />
  );
}
