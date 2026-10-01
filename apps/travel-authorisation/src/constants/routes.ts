export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REQUESTS: '/requests',
  NEW_REQUEST: '/requests/new',
  REQUEST_DETAIL: '/requests/:requestId',
  APPROVALS: '/approvals',
  RECONCILIATION: '/reconciliation',
  REPORTS: '/reports',
  CONFIGURATION: '/configuration',
  STUDENT_HOME: '/student',
  STUDENT_NEW_REQUEST: '/student/requests/new',
  STUDENT_REQUEST_DETAIL: '/student/requests/:requestId',
} as const;

export const requestRoute = (requestId: string) => `/requests/${requestId}`;
export const studentRequestRoute = (requestId: string) => `/student/requests/${requestId}`;
