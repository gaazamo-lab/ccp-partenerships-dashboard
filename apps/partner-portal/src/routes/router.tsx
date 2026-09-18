import { createBrowserRouter } from 'react-router';

import { ProtectedRoute } from '@partner-crm/auth';

import { MainLayout } from '@/components/layout/MainLayout';
import { ROUTES } from '@/constants/routes';

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    lazy: () => import('@/features/auth/pages/Login'),
  },
  {
    element: <ProtectedRoute redirectTo={ROUTES.LOGIN} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            lazy: () => import('@/features/dashboard/pages/Dashboard'),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    lazy: () => import('@/features/dashboard/pages/NotFound'),
  },
]);
