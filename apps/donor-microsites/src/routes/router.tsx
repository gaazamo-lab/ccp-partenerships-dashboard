import { createBrowserRouter } from 'react-router';

import { ProtectedRoute } from '@partner-crm/auth';

import { MainLayout } from '@/components/layout/MainLayout';
import { ROUTES } from '@/constants/routes';
import { MicrositesProvider } from '@/features/microsites/state/MicrositesProvider';
import { PublicLayout } from '@/features/public/PublicLayout';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.PUBLIC_HOME, lazy: () => import('@/features/public/pages/PublicHome') },
      { path: ROUTES.PUBLIC_SITE, lazy: () => import('@/features/public/pages/PublicSite') },
    ],
  },
  { path: ROUTES.LOGIN, lazy: () => import('@/features/auth/pages/Login') },
  {
    element: <ProtectedRoute redirectTo={ROUTES.LOGIN} />,
    children: [
      {
        path: ROUTES.ADMIN,
        element: (
          <MicrositesProvider>
            <MainLayout />
          </MicrositesProvider>
        ),
        children: [
          { index: true, lazy: () => import('@/features/dashboard/pages/Dashboard') },
          { path: ROUTES.SITES, lazy: () => import('@/features/microsites/pages/Microsites') },
          { path: ROUTES.SITE_CREATE, lazy: () => import('@/features/microsites/pages/CreateMicrosite') },
          { path: ROUTES.SITE_DETAIL, lazy: () => import('@/features/microsites/pages/SiteBuilder') },
          { path: ROUTES.TEMPLATES, lazy: () => import('@/features/microsites/pages/Templates') },
          { path: ROUTES.ANALYTICS, lazy: () => import('@/features/microsites/pages/Analytics') },
        ],
      },
    ],
  },
  { path: '*', lazy: () => import('@/features/dashboard/pages/NotFound') },
]);
