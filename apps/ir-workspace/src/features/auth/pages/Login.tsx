import { LoginScreen } from '@partner-crm/auth';

import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';

export function Component() {
  return (
    <LoginScreen
      tagline="International Relations & Protocols"
      // description="Coordinate visits, diplomatic correspondence, protocol and official gifts."
      homePath={ROUTES.HOME}
      defaultEmail={env.authMode === 'mock' ? 'officer@clet.gov.gh' : ''}
      defaultPassword={env.authMode === 'mock' ? 'preview-pass' : ''}
    />
  );
}
