import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from './useAuth';

interface ProtectedRouteProps {
  redirectTo: string;
}

export function ProtectedRoute({ redirectTo }: ProtectedRouteProps) {
  const { ready, user } = useAuth();
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
