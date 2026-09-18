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
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarItem,
  SidebarLink,
  SidebarNav,
  Toaster,
} from '@rfdtech/components';
import { Handshake, LayoutDashboard } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { initialsOf } from '@partner-crm/utils';

import { ROUTES } from '@/constants/routes';

export function MainLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    void navigate(ROUTES.LOGIN, { replace: true });
  };

  const profileName = user?.name ?? 'Partner user';

  return (
    <AppLayout>
      <AppHeader variant="plain">
        <AppHeaderSearch placeholder="Search Partner CRM" />
        <AppHeaderActions>
          <AppHeaderNotifications />
        </AppHeaderActions>
      </AppHeader>

      <AppSidebar>
        <Sidebar variant="primary">
          <SidebarHeader>
            <SidebarBrand
              logo={<Handshake size={28} strokeWidth={1.75} aria-hidden />}
              title="Partner CRM"
              subtitle="Relationship workspace"
            />
          </SidebarHeader>

          <SidebarContent>
            <SidebarNav aria-label="Partner CRM navigation">
              <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarItem>
                  <SidebarLink
                    to={ROUTES.HOME}
                    active={pathname === ROUTES.HOME}
                    icon={<LayoutDashboard size={18} strokeWidth={1.75} aria-hidden />}
                  >
                    Overview
                  </SidebarLink>
                </SidebarItem>
              </SidebarGroup>
            </SidebarNav>
          </SidebarContent>

          <SidebarFooter>
            <ProfilePopover
              user={{
                name: profileName,
                role: user?.role ?? 'CRM user',
                email: user?.email,
                initials: initialsOf(profileName),
              }}
              variant="full"
              items={[]}
              noConfirmSignOut
              onSignOut={() => void handleSignOut()}
            />
          </SidebarFooter>
        </Sidebar>
      </AppSidebar>

      <AppBody>
        <Outlet />
        <Toaster />
      </AppBody>
    </AppLayout>
  );
}
