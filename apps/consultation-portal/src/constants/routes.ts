export const ROUTES = {
  PUBLIC_HOME: '/',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_HOME: '/admin',
  ADMIN_CONSULTATIONS: '/admin/consultations',
  ADMIN_CREATE: '/admin/consultations/new',
} as const;

export const consultationRoute = (slug: string) => `/consultations/${slug}`;
export const thankYouRoute = (slug: string) => `/consultations/${slug}/thank-you`;
export const adminConsultationRoute = (id: string) => `/admin/consultations/${id}`;
export const adminEditRoute = (id: string) => `/admin/consultations/${id}/edit`;
export const adminReportRoute = (id: string) => `/admin/consultations/${id}/report`;
