import { createBrowserRouter } from 'react-router';

import { ProtectedRoute } from '@partner-crm/auth';

import { AdminLayout } from '@/components/AdminLayout';
import { PublicLayout } from '@/components/PublicLayout';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, lazy: () => import('@/features/public/pages/PublicHome') },
      { path: 'consultations/:slug', lazy: () => import('@/features/public/pages/ConsultationDetail') },
      { path: 'consultations/:slug/thank-you', lazy: () => import('@/features/public/pages/ThankYou') },
    ],
  },
  { path: 'admin/login', lazy: () => import('@/features/auth/pages/Login') },
  {
    element: <ProtectedRoute redirectTo="/admin/login" />,
    children: [{
      path: 'admin',
      element: <AdminLayout />,
      children: [
        { index: true, lazy: () => import('@/features/admin/pages/Dashboard') },
        { path: 'consultations', lazy: () => import('@/features/admin/pages/Consultations') },
        { path: 'consultations/new', lazy: () => import('@/features/admin/pages/CreateConsultation') },
        { path: 'consultations/:consultationId', lazy: () => import('@/features/admin/pages/ConsultationDetail') },
        { path: 'consultations/:consultationId/edit', lazy: () => import('@/features/admin/pages/EditConsultation') },
      ],
    }, {
      path: 'admin/consultations/:consultationId/report',
      lazy: () => import('@/features/admin/pages/SummaryReport'),
    }],
  },
  { path: '*', lazy: () => import('@/features/public/pages/NotFound') },
]);
