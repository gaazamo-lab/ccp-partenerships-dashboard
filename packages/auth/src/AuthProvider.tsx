import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { AuthContext } from './AuthContext';
import type { AuthClient, AuthUser, LoginCredentials } from './types';

interface AuthProviderProps {
  client: AuthClient;
  children: ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;

    void client
      .getSession()
      .then((sessionUser) => {
        if (active) setUser(sessionUser);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [client]);

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      const sessionUser = await client.login(credentials);
      setUser(sessionUser);
    },
    [client],
  );

  const signOut = useCallback(async () => {
    await client.logout();
    setUser(null);
  }, [client]);

  const value = useMemo(() => ({ ready, user, signIn, signOut }), [ready, signIn, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
