import { type ReactNode, useMemo, useState } from 'react';

import { useAuth } from '@partner-crm/auth';

import { env } from '@/config/env';

import { OPERATIONAL_ROLES, type OperationalRole, RoleContext } from './role-context';

const KEY = 's084.preview.role';

/**
 * In API mode the role is the signed-in user's own S084 role: the server
 * enforces the same permissions, so a client-side switcher would only mislead.
 * The switcher (and its session-scoped choice) exists for mock mode alone.
 */
function roleFromAccount(accountRole?: string): OperationalRole {
  if ((OPERATIONAL_ROLES as readonly string[]).includes(accountRole ?? '')) {
    return accountRole as OperationalRole;
  }
  // System and CRM administrators hold every S084 permission on the server.
  if (accountRole === 'System Administrator' || accountRole === 'CRM Administrator') {
    return 'DTI Administrator';
  }
  return 'Auditor';
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [previewRole, setRoleState] = useState<OperationalRole>(
    () => (sessionStorage.getItem(KEY) as OperationalRole | null) ?? 'DTI Administrator',
  );
  const role = env.dataMode === 'api' ? roleFromAccount(user?.role) : previewRole;
  const value = useMemo(
    () => ({
      role,
      switchable: env.dataMode !== 'api',
      setRole(next: OperationalRole) {
        if (env.dataMode === 'api') return;
        sessionStorage.setItem(KEY, next);
        setRoleState(next);
      },
      canCreate: ['Traveller', 'IR Officer', 'DTI Administrator'].includes(role),
      canOperate: ['IR Officer', 'P&C Reviewer', 'RMF Reviewer', 'DTI Administrator'].includes(
        role,
      ),
      canApprove: [
        'Line Manager',
        'Senior Approver',
        'P&C Reviewer',
        'RMF Reviewer',
        'DTI Administrator',
      ].includes(role),
      canConfigure: role === 'DTI Administrator',
    }),
    [role],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
