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
          <WorkspaceLaunchpad current="partners" />
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
        </AppHeaderActions>
      </AppHeader>

      <AppSidebar>
        <Sidebar variant="primary">
          <SidebarHeader>
            <SidebarBrand
              logo={<img src="/clet-logo.png" alt="" width={28} height={28} />}
              title="CCP Partnerships"
              subtitle="Stakeholders & agreements"
            />
          </SidebarHeader>

          <SidebarContent>
            <SidebarNav aria-label="CCP Partnerships navigation">
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
