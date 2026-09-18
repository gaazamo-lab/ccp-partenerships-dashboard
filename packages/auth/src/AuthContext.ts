import { createContext } from 'react';

import type { AuthUser, LoginCredentials } from './types';

export interface AuthContextValue {
  ready: boolean;
  user: AuthUser | null;
  signIn(credentials: LoginCredentials): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
