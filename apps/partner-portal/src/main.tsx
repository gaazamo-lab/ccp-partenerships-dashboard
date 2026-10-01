import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { AuthProvider } from '@partner-crm/auth';
import { AppProviders } from '@partner-crm/ui';

import { authClient } from '@/config/auth';
import { KolProvider } from '@/features/kol/state/KolProvider';
import { PartnershipsProvider } from '@/features/partnerships/state/PartnershipsProvider';
import { CrmProvider } from '@/features/stakeholders/state/CrmContext';
import { router } from '@/routes/router';

import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Root element #root was not found.');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <AuthProvider client={authClient}>
        <CrmProvider>
          <PartnershipsProvider>
            <KolProvider>
              <RouterProvider router={router} />
            </KolProvider>
          </PartnershipsProvider>
        </CrmProvider>
      </AuthProvider>
    </AppProviders>
  </StrictMode>,
);
