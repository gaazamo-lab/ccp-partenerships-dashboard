import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import {
  AppBody,
  AppHeader,
  AppHeaderActions,
  AppHeaderNotifications,
  AppHeaderSearch,
  AppLayout,
  AppSidebar,
  Button,
  Notice,
  ProfilePopover,
  Sidebar,
  SidebarBrand,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarItem,
  SidebarLink,
  SidebarNav,
  Toaster,
} from '@rfdtech/components';
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  RefreshCcw,
  RotateCw,
  Settings,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { WorkspaceLaunchpad } from '@partner-crm/ui';
import { initialsOf } from '@partner-crm/utils';

import { ROUTES, requestRoute } from '@/constants/routes';
import { OPERATIONAL_ROLES, useOperationalRole } from '@/features/access/role-context';
import { usePermittedRequests } from '@/features/access/usePermittedRequests';
import { useRequests } from '@/features/requests/requests-context';

const nav = [
  {
    label: 'Workspace',
    items: [
      { to: ROUTES.HOME, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.REQUESTS, label: 'Requests', icon: FileText },
      { to: ROUTES.APPROVALS, label: 'Approvals', icon: ClipboardCheck },
      { to: ROUTES.RECONCILIATION, label: 'Reconciliation', icon: RefreshCcw },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: ROUTES.REPORTS, label: 'Reports', icon: BarChart3 },
      { to: ROUTES.CONFIGURATION, label: 'Configuration', icon: Settings },
    ],
  },
];

export function MainLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, setRole, switchable, canConfigure } = useOperationalRole();
  const requests = usePermittedRequests();
  const { error, reload } = useRequests();
  const [search, setSearch] = useState('');
  const profileName = user?.name ?? 'Travel operations user';
  const active = (to: string) =>
    to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <AppLayout>
      <AppHeader variant="plain">
        <AppHeaderSearch
          placeholder="Search requests and travellers"
          onSearch={setSearch}
          showEmpty={Boolean(search)}
          emptyLabel="No permitted requests found"
          data={
            search
              ? [
                  {
                    heading: 'Requests',
                    items: requests
                      .filter((request) =>
                        `${request.reference} ${request.traveller} ${request.destination}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .slice(0, 8)
                      .map((request) => ({
                        value: request.id,
                        label: `${request.traveller} · ${request.reference} · ${request.destination}`,
                        onSelect: () => navigate(requestRoute(request.id)),
                      })),
                  },
                ]
              : []
          }
        />
        <AppHeaderActions>
          {switchable ? (
            <label className="hidden items-center gap-2 text-xs font-semibold text-foreground-muted md:flex">
              Preview role
              <select
                className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-sm text-foreground"
                value={role}
                onChange={(event) => setRole(event.target.value as typeof role)}
              >
                {OPERATIONAL_ROLES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          ) : null}
          <AppHeaderNotifications />
          <WorkspaceLaunchpad current="travel" />
        </AppHeaderActions>
      </AppHeader>
      <AppSidebar>
        <Sidebar variant="primary">
          <SidebarHeader>
            <SidebarBrand
              logo={<img src="/clet-logo.png" alt="" width={28} height={28} />}
              title="Visa & Travel"
              subtitle="Authorisation workspace"
            />
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav aria-label="Visa and travel navigation">
              {nav.map((group) => (
                <SidebarGroup key={group.label} collapsible defaultExpanded>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  {group.items
                    .filter((item) => item.to !== ROUTES.CONFIGURATION || canConfigure)
                    .map((item) => (
                      <SidebarItem key={item.to}>
                        <SidebarLink
                          to={item.to}
                          active={active(item.to)}
                          icon={<item.icon size={18} strokeWidth={1.75} />}
                        >
                          {item.label}
                        </SidebarLink>
                      </SidebarItem>
                    ))}
                </SidebarGroup>
              ))}
            </SidebarNav>
          </SidebarContent>
          <SidebarFooter>
            <ProfilePopover
              user={{
                name: profileName,
                role,
                email: user?.email,
                initials: initialsOf(profileName),
              }}
              variant="full"
              items={[]}
              noConfirmSignOut
              onSignOut={() => void signOut().then(() => navigate(ROUTES.LOGIN, { replace: true }))}
            />
          </SidebarFooter>
        </Sidebar>
      </AppSidebar>
      <AppBody>
        {error ? (
          <Notice variant="error" title="S084 could not be reached" leftBorder>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{error} The other CLET portals are unaffected.</p>
              <Button variant="outline" size="sm" onClick={reload}>
                <RotateCw size={14} aria-hidden /> Try again
              </Button>
            </div>
          </Notice>
        ) : null}
        <Outlet />
        <Toaster />
      </AppBody>
    </AppLayout>
  );
}
