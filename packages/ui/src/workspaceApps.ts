/**
 * Every CCP frontend in this monorepo. In production each app is served under
 * its own path on one origin, so the session cookie is shared; in development
 * each Vite server has its own port.
 */
export const WORKSPACE_APPS = [
  { id: 'partners', name: 'Partnerships Portal', path: '/partners/', devPort: 5175 },
  { id: 'consultations', name: 'Consultations', path: '/consultations/admin', devPort: 5176 },
  { id: 'travel', name: 'Visa & Travel', path: '/travel/', devPort: 5177 },
  { id: 'microsites', name: 'Donor Microsites', path: '/microsites/admin', devPort: 5178 },
  { id: 'international', name: 'International Relations', path: '/ir/', devPort: 5179 },
] as const;

export type WorkspaceAppId = (typeof WORKSPACE_APPS)[number]['id'];
