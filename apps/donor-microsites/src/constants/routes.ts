export const ROUTES = {
  PUBLIC_HOME: '/',
  PUBLIC_SITE: '/sites/:slug',
  LOGIN: '/admin/login',
  ADMIN: '/admin',
  SITES: '/admin/sites',
  SITE_CREATE: '/admin/sites/new',
  SITE_DETAIL: '/admin/sites/:siteId',
  TEMPLATES: '/admin/templates',
  ANALYTICS: '/admin/analytics',
} as const;

export function siteRoute(siteId: string) {
  return `/admin/sites/${siteId}`;
}

export function publicSiteRoute(slug: string) {
  return `/sites/${slug}`;
}
