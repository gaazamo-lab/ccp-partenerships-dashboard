import { useAuth } from '@partner-crm/auth';

import { canKol } from '@/features/kol/permissions';

/** The signed-in user's S092 permissions and the name recorded against their actions. */
export function useKolAccess() {
  const { user } = useAuth();
  return {
    canManage: canKol(user?.role, 'manage'),
    canExport: canKol(user?.role, 'export'),
    actor: user?.name ?? 'Current user',
  };
}
