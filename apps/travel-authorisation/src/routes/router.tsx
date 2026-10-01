import { createBrowserRouter } from 'react-router';

import { ProtectedRoute } from '@partner-crm/auth';

import { MainLayout } from '@/components/MainLayout';
import { StudentLayout } from '@/components/StudentLayout';
import { ROUTES } from '@/constants/routes';

export const router = createBrowserRouter([
  { path: ROUTES.LOGIN, lazy: () => import('@/features/auth/Login') },
  {
    element: <ProtectedRoute redirectTo={ROUTES.LOGIN} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, lazy: () => import('@/features/dashboard/Dashboard') },
          { path: ROUTES.REQUESTS.slice(1), lazy: () => import('@/features/requests/Requests') },
          {
            path: ROUTES.NEW_REQUEST.slice(1),
            lazy: () => import('@/features/requests/NewRequest'),
          },
          {
            path: ROUTES.REQUEST_DETAIL.slice(1),
            lazy: () => import('@/features/requests/RequestDetail'),
          },
          { path: ROUTES.APPROVALS.slice(1), lazy: () => import('@/features/approvals/Approvals') },
          {
            path: ROUTES.RECONCILIATION.slice(1),
            lazy: () => import('@/features/reconciliation/Reconciliation'),
          },
          { path: ROUTES.REPORTS.slice(1), lazy: () => import('@/features/reports/Reports') },
          {
            path: ROUTES.CONFIGURATION.slice(1),
            lazy: () => import('@/features/configuration/Configuration'),
          },
        ],
      },
      {
        path: ROUTES.STUDENT_HOME.slice(1),
        element: <StudentLayout />,
        children: [
          { index: true, lazy: () => import('@/features/student/StudentDashboard') },
          {
            path: 'requests/new',
            lazy: () => import('@/features/student/StudentNewRequest'),
          },
          {
            path: 'requests/:requestId',
            lazy: () => import('@/features/student/StudentRequestDetail'),
          },
        ],
      },
    ],
  },
  { path: '*', lazy: () => import('@/features/NotFound') },
]);
