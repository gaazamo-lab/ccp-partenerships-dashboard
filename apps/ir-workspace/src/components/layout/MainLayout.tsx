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

import { useAuth } from '@partner-crm/auth';
import { WorkspaceLaunchpad } from '@partner-crm/ui';
import { initialsOf } from '@partner-crm/utils';

import { ROUTES } from '@/constants/routes';

import { NAV_GROUPS, isNavItemActive } from './navigation';

export function MainLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const profileName = user?.name ?? 'CCP user';

  const handleSignOut = async () => {
    await signOut();
    void navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <AppLayout>
      <AppHeader variant="plain">
        <AppHeaderSearch placeholder="Search engagements and correspondence" />
        <AppHeaderActions>
          <AppHeaderNotifications />
          <WorkspaceLaunchpad current="international" />
          <ProfilePopover
            user={{
              name: profileName,
              role: user?.role ?? 'CCP user',
              email: user?.email,
              initials: initialsOf(profileName),
            }}
            variant="full"
            items={[]}
            noConfirmSignOut
            onSignOut={() => void handleSignOut()}
          />
        </AppHeaderActions>
      </AppHeader>

      <AppSidebar>
        <Sidebar variant="primary">
          <SidebarHeader>
            <SidebarBrand
              logo={<img src="/clet-logo.png" alt="" width={28} height={28} />}
              title="International Relations"
              subtitle="Protocols workspace"
            />
          </SidebarHeader>

          <SidebarContent>
            <SidebarNav aria-label="International Relations navigation">
              {NAV_GROUPS.map((group) => (
                <SidebarGroup key={group.label} collapsible defaultExpanded>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarItem key={item.to}>
                        <SidebarLink
                          to={item.to}
                          active={isNavItemActive(item, pathname)}
                          icon={<Icon size={18} strokeWidth={1.75} aria-hidden />}
                        >
                          {item.label}
                        </SidebarLink>
                      </SidebarItem>
                    );
                  })}
                </SidebarGroup>
              ))}
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
