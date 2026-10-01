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
          {
            path: ROUTES.STAKEHOLDERS.slice(1),
            lazy: () => import('@/features/stakeholders/pages/Stakeholders'),
          },
          {
            path: ROUTES.STAKEHOLDER_CREATE.slice(1),
            lazy: () => import('@/features/stakeholders/pages/CreateStakeholder'),
          },
          {
            path: ROUTES.STAKEHOLDER_PROFILE.slice(1),
            lazy: () => import('@/features/stakeholders/pages/StakeholderProfile'),
          },
          {
            path: ROUTES.COMPLIANCE.slice(1),
            lazy: () => import('@/features/compliance/pages/Compliance'),
          },
          {
            path: ROUTES.SEGMENTS.slice(1),
            lazy: () => import('@/features/segments/pages/Segments'),
          },
          {
            path: ROUTES.SEGMENT_CREATE.slice(1),
            lazy: () => import('@/features/segments/pages/CreateSegment'),
          },
          {
            path: ROUTES.SEGMENT_EDIT.slice(1),
            lazy: () => import('@/features/segments/pages/EditSegment'),
          },
          {
            path: ROUTES.REPORTS.slice(1),
            lazy: () => import('@/features/reports/pages/Reports'),
          },
          {
            path: ROUTES.PARTNERSHIPS.slice(1),
            lazy: () => import('@/features/partnerships/pages/Partnerships'),
          },
          {
            path: ROUTES.PARTNERSHIP_CREATE.slice(1),
            lazy: () => import('@/features/partnerships/pages/CreatePartnership'),
          },
          {
            path: ROUTES.PARTNERSHIP_DETAIL.slice(1),
            lazy: () => import('@/features/partnerships/pages/PartnershipDetail'),
          },
          {
            path: ROUTES.PARTNERSHIP_OBLIGATIONS.slice(1),
            lazy: () => import('@/features/partnerships/pages/Obligations'),
          },
          {
            path: ROUTES.PARTNERSHIP_CALENDAR.slice(1),
            lazy: () => import('@/features/partnerships/pages/MilestoneCalendar'),
          },
          {
            path: ROUTES.KOLS.slice(1),
            lazy: () => import('@/features/kol/pages/KolRegister'),
          },
          {
            path: ROUTES.KOL_CREATE.slice(1),
            lazy: () => import('@/features/kol/pages/CreateKol'),
          },
          {
            path: ROUTES.KOL_PIPELINE.slice(1),
            lazy: () => import('@/features/kol/pages/KolPipeline'),
          },
          {
            path: ROUTES.KOL_IMPACT.slice(1),
            lazy: () => import('@/features/kol/pages/KolImpact'),
          },
          {
            path: ROUTES.KOL_PROFILE.slice(1),
            lazy: () => import('@/features/kol/pages/KolProfile'),
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
