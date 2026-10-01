import { LoginScreen } from '@partner-crm/auth';

import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';

export function Component() {
  return (
    <LoginScreen
      tagline="Partnerships Portal"
      // description="Stakeholder relationships, MOUs and partnerships, and thought-leader engagement."
      homePath={ROUTES.HOME}
      defaultEmail={env.authMode === 'mock' ? 'partner@clet.gov.gh' : ''}
      defaultPassword={env.authMode === 'mock' ? 'partnercrm' : ''}
    />
  );
}
