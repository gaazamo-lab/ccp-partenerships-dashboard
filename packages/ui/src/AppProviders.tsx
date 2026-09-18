import type { ReactNode } from 'react';

import { ThemeProvider, ToastProvider } from '@rfdtech/components';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider defaultTheme="light">
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
