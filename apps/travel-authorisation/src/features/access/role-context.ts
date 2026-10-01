import { createContext, useContext } from 'react';

export const OPERATIONAL_ROLES = [
  'Traveller',
  'IR Officer',
  'Line Manager',
  'Senior Approver',
  'P&C Reviewer',
  'RMF Reviewer',
  'Auditor',
  'DTI Administrator',
] as const;

export type OperationalRole = (typeof OPERATIONAL_ROLES)[number];

export interface RoleContextValue {
  role: OperationalRole;
  /** False when the role comes from the signed-in account (API mode). */
  switchable: boolean;
  setRole: (role: OperationalRole) => void;
  canCreate: boolean;
  canOperate: boolean;
  canApprove: boolean;
  canConfigure: boolean;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function useOperationalRole() {
  const value = useContext(RoleContext);
  if (!value) throw new Error('useOperationalRole must be used within RoleProvider.');
  return value;
}
