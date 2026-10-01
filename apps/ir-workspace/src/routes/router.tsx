import { createBrowserRouter } from 'react-router';

import { ProtectedRoute } from '@partner-crm/auth';

import { MainLayout } from '@/components/layout/MainLayout';
import { ROUTES } from '@/constants/routes';

export const router = createBrowserRouter([
  { path: ROUTES.LOGIN, lazy: () => import('@/features/auth/pages/Login') },
  {
    element: <ProtectedRoute redirectTo={ROUTES.LOGIN} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, lazy: () => import('@/features/dashboard/pages/Dashboard') },
          { path: ROUTES.ENGAGEMENTS, lazy: () => import('@/features/international/pages/Engagements') },
          { path: ROUTES.ENGAGEMENT_CREATE, lazy: () => import('@/features/international/pages/CreateEngagement') },
          { path: ROUTES.ENGAGEMENT_DETAIL, lazy: () => import('@/features/international/pages/EngagementDetail') },
          { path: ROUTES.CALENDAR, lazy: () => import('@/features/international/pages/Calendar') },
          { path: ROUTES.CORRESPONDENCE, lazy: () => import('@/features/international/pages/Correspondence') },
          { path: ROUTES.CORRESPONDENCE_DETAIL, lazy: () => import('@/features/international/pages/CorrespondenceDetail') },
          { path: ROUTES.TEMPLATES, lazy: () => import('@/features/international/pages/Templates') },
          { path: ROUTES.GIFTS, lazy: () => import('@/features/international/pages/Gifts') },
          { path: ROUTES.FOLLOW_UPS, lazy: () => import('@/features/international/pages/FollowUps') },
          { path: ROUTES.REPORTS, lazy: () => import('@/features/international/pages/Reports') },
        ],
      },
    ],
  },
  { path: '*', lazy: () => import('@/features/dashboard/pages/NotFound') },
]);
