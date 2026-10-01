export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ENGAGEMENTS: '/engagements',
  ENGAGEMENT_CREATE: '/engagements/new',
  ENGAGEMENT_DETAIL: '/engagements/:engagementId',
  CALENDAR: '/calendar',
  CORRESPONDENCE: '/correspondence',
  CORRESPONDENCE_DETAIL: '/correspondence/:correspondenceId',
  TEMPLATES: '/templates',
  GIFTS: '/gifts',
  FOLLOW_UPS: '/follow-ups',
  REPORTS: '/reports',
} as const;

export function engagementRoute(engagementId: string) {
  return `/engagements/${engagementId}`;
}

export function correspondenceRoute(correspondenceId: string) {
  return `/correspondence/${correspondenceId}`;
}
