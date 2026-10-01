import { Launchpad, SystemLaunchpadIcon } from '@rfdtech/components';

import { WORKSPACE_APPS, type WorkspaceAppId } from './workspaceApps';

const DEV_PORTS = new Set<string>(WORKSPACE_APPS.map((app) => String(app.devPort)));

function hrefFor(app: (typeof WORKSPACE_APPS)[number]): string {
  const { hostname, port, protocol } = window.location;
  if (DEV_PORTS.has(port)) {
    const devPath = app.path.startsWith('/consultations') || app.path.startsWith('/microsites')
      ? '/admin'
      : '/';
    return `${protocol}//${hostname}:${app.devPort}${devPath}`;
  }
  return app.path;
}

interface WorkspaceLaunchpadProps {
  /** The app rendering the launchpad; it is left out of the list. */
  current: WorkspaceAppId;
}

/** Header app switcher linking the CCP portals together. */
export function WorkspaceLaunchpad({ current }: WorkspaceLaunchpadProps) {
  const apps = WORKSPACE_APPS.filter((app) => app.id !== current).map((app) => ({
    id: app.id,
    name: app.name,
    href: hrefFor(app),
    icon: <SystemLaunchpadIcon name={app.name} />,
  }));

  return (
    <Launchpad
      apps={apps}
      onAppSelect={(app) => {
        if (app.href) window.location.assign(app.href);
      }}
    />
  );
}
