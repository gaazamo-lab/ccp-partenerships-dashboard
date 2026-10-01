import { Outlet, useLocation, useNavigate } from 'react-router';

import {
  AppBody,
  AppHeader,
  AppHeaderActions,
  AppHeaderNotifications,
  AppHeaderSearch,
  AppLayout,
  AppSidebar,
  ProfilePopover,
  Sidebar,
  SidebarBrand,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarItem,
  SidebarLink,
  SidebarNav,
  Toaster,
} from '@rfdtech/components';
import { BarChart3, ClipboardList, Globe, Plus } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { WorkspaceLaunchpad } from '@partner-crm/ui';
import { initialsOf } from '@partner-crm/utils';

import { ROUTES } from '@/constants/routes';

const items = [
  { label: 'Overview', to: ROUTES.ADMIN_HOME, icon: BarChart3, exact: true },
  { label: 'Consultations', to: ROUTES.ADMIN_CONSULTATIONS, icon: ClipboardList, exact: false },
  { label: 'New consultation', to: ROUTES.ADMIN_CREATE, icon: Plus, exact: true },
  { label: 'Public site', to: ROUTES.PUBLIC_HOME, icon: Globe, exact: true },
];

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const name = user?.name ?? 'Consultation administrator';

  const isActive = (item: (typeof items)[number]) =>
    item.exact
      ? pathname === item.to
      : pathname.startsWith(item.to) && pathname !== ROUTES.ADMIN_CREATE;

  return (
    <AppLayout>
      <AppHeader variant="plain">
        <AppHeaderSearch placeholder="Search consultations" />
        <AppHeaderActions>
          <AppHeaderNotifications />
          <WorkspaceLaunchpad current="consultations" />
          <ProfilePopover
            user={{ name, email: user?.email, role: user?.role ?? 'CCP user', initials: initialsOf(name) }}
            variant="full"
            items={[]}
            noConfirmSignOut
            onSignOut={() => void signOut().then(() => navigate(ROUTES.ADMIN_LOGIN, { replace: true }))}
          />
        </AppHeaderActions>
      </AppHeader>
      <AppSidebar>
        <Sidebar variant="primary">
          <SidebarHeader>
            <SidebarBrand
              logo={<img src="/clet-logo.png" alt="" width={28} height={28} />}
              title="CLET Consultations"
              subtitle="Survey administration"
            />
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav aria-label="Consultation administration">
              <SidebarGroup collapsible defaultExpanded>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                {items.map((item) => (
                  <SidebarItem key={item.to}>
                    <SidebarLink to={item.to} active={isActive(item)} icon={<item.icon size={18} strokeWidth={1.75} aria-hidden />}>
                      {item.label}
                    </SidebarLink>
                  </SidebarItem>
                ))}
              </SidebarGroup>
            </SidebarNav>
          </SidebarContent>
        </Sidebar>
      </AppSidebar>
      <AppBody>
        <Outlet />
        <Toaster />
      </AppBody>
    </AppLayout>
  );
}
