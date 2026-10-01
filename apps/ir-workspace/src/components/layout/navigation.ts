import { type LucideIcon, BarChart3, CalendarDays, FileText, Gift, Globe2, LayoutDashboard, ListChecks, Mail } from 'lucide-react';

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
      { to: ROUTES.HOME, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.ENGAGEMENTS, label: 'Engagements', icon: Globe2 },
      { to: ROUTES.CALENDAR, label: 'Calendar', icon: CalendarDays },
      { to: ROUTES.FOLLOW_UPS, label: 'Follow-ups', icon: ListChecks },
    ],
  },
  {
    label: 'Protocol',
    items: [
      { to: ROUTES.CORRESPONDENCE, label: 'Correspondence', icon: Mail },
      { to: ROUTES.TEMPLATES, label: 'Letter templates', icon: FileText },
      { to: ROUTES.GIFTS, label: 'Gifts register', icon: Gift },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: ROUTES.REPORTS, label: 'Reports', icon: BarChart3 },
    ],
  },
];

/** The home item matches exactly; everything else matches its prefix. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.to === ROUTES.HOME) return pathname === ROUTES.HOME;
  const prefixes = [item.to, ...(item.matches ?? [])];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
