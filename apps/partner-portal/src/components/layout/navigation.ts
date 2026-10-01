import {
  BarChart3,
  Building2,
  CalendarRange,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * Also light this item up for these path prefixes. Set it when a section's
   * detail pages live outside its own route — otherwise the sidebar goes blank
   * the moment a user opens a record.
   */
  matches?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The sidebar, as data. Adding a section means adding an entry here and a route
 * — not editing layout markup — which is what keeps the nav and the router from
 * drifting apart.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Stakeholders',
    items: [
      { to: ROUTES.HOME, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.STAKEHOLDERS, label: 'Stakeholders', icon: Building2 },
      { to: ROUTES.COMPLIANCE, label: 'Compliance', icon: ShieldCheck },
      { to: ROUTES.SEGMENTS, label: 'Segments', icon: UsersRound },
    ],
  },
  {
    label: 'MOUs & partnerships',
    items: [
      { to: ROUTES.PARTNERSHIPS, label: 'Agreements', icon: ScrollText },
      { to: ROUTES.PARTNERSHIP_OBLIGATIONS, label: 'Obligations', icon: ListChecks },
      { to: ROUTES.PARTNERSHIP_CALENDAR, label: 'Milestone calendar', icon: CalendarRange },
    ],
  },
  {
    label: 'Thought leaders',
    items: [
      { to: ROUTES.KOLS, label: 'KOL register', icon: Sparkles },
      { to: ROUTES.KOL_PIPELINE, label: 'Outreach planner', icon: Megaphone },
      { to: ROUTES.KOL_IMPACT, label: 'Impact', icon: BarChart3 },
    ],
  },
  {
    label: 'Insights',
    items: [{ to: ROUTES.REPORTS, label: 'Reports', icon: BarChart3 }],
  },
];

/**
 * `/` is the overview and every other route starts with `/`, so the home item
 * has to match exactly or it would stay highlighted on every page.
 */
const SIBLING_SECTIONS: Record<string, string[]> = {
  [ROUTES.PARTNERSHIPS]: [ROUTES.PARTNERSHIP_OBLIGATIONS, ROUTES.PARTNERSHIP_CALENDAR],
  [ROUTES.KOLS]: [ROUTES.KOL_PIPELINE, ROUTES.KOL_IMPACT],
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.to === ROUTES.HOME) return pathname === ROUTES.HOME;
  const siblings = SIBLING_SECTIONS[item.to] ?? [];
  if (siblings.some((sibling) => pathname === sibling || pathname.startsWith(`${sibling}/`))) {
    return false;
  }
  const prefixes = [item.to, ...(item.matches ?? [])];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
