import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { AuthProvider } from '@partner-crm/auth';
import { AppProviders } from '@partner-crm/ui';

import { authClient } from '@/config/auth';
import { RoleProvider } from '@/features/access/RoleProvider';
import { RequestsProvider } from '@/features/requests/RequestsContext';
import { router } from '@/routes/router';

import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root was not found.');
createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <AuthProvider client={authClient}>
        <RoleProvider>
          <RequestsProvider>
            <RouterProvider router={router} />
          </RequestsProvider>
        </RoleProvider>
      </AuthProvider>
    </AppProviders>
  </StrictMode>,
);
