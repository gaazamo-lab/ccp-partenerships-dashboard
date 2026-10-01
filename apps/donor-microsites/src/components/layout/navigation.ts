import { type LucideIcon, BarChart3, LayoutDashboard, LayoutTemplate, PanelsTopLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Also light this item up for these path prefixes. */
  matches?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** The sidebar, as data: add an entry here and a route, not layout markup. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { to: ROUTES.ADMIN, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.SITES, label: 'Microsites', icon: PanelsTopLeft },
      { to: ROUTES.TEMPLATES, label: 'Template library', icon: LayoutTemplate },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: ROUTES.ANALYTICS, label: 'Engagement analytics', icon: BarChart3 },
    ],
  },
];

/** The home item matches exactly; everything else matches its prefix. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.to === ROUTES.ADMIN) return pathname === ROUTES.ADMIN;
  const prefixes = [item.to, ...(item.matches ?? [])];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
