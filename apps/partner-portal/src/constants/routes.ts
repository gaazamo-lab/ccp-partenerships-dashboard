export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  STAKEHOLDERS: '/stakeholders',
  STAKEHOLDER_CREATE: '/stakeholders/new',
  STAKEHOLDER_PROFILE: '/stakeholders/:stakeholderId',
  COMPLIANCE: '/compliance',
  SEGMENTS: '/segments',
  SEGMENT_CREATE: '/segments/new',
  SEGMENT_EDIT: '/segments/:segmentId/edit',
  REPORTS: '/reports',
  PARTNERSHIPS: '/partnerships',
  PARTNERSHIP_CREATE: '/partnerships/new',
  PARTNERSHIP_DETAIL: '/partnerships/:partnershipId',
  PARTNERSHIP_OBLIGATIONS: '/partnerships/obligations',
  PARTNERSHIP_CALENDAR: '/partnerships/calendar',
  KOLS: '/kol',
  KOL_CREATE: '/kol/new',
  KOL_PROFILE: '/kol/:kolId',
  KOL_PIPELINE: '/kol/pipeline',
  KOL_IMPACT: '/kol/impact',
} as const;

export function stakeholderProfileRoute(stakeholderId: string) {
  return `/stakeholders/${stakeholderId}`;
}

export function segmentEditRoute(segmentId: string) {
  return `/segments/${segmentId}/edit`;
}

export function partnershipRoute(partnershipId: string) {
  return `/partnerships/${partnershipId}`;
}

export function kolProfileRoute(kolId: string) {
  return `/kol/${kolId}`;
}
