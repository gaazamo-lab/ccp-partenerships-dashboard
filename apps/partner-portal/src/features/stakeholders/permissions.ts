/**
 * S081 role matrix. Pages gate buttons through `canManageStakeholders` and show
 * the button disabled with `permissionHint` rather than hiding it, so a
 * read-only user can still see what the workflow is.
 */
export type StakeholderPermission =
  | 'create'
  | 'edit'
  | 'engage'
  | 'manage_contacts'
  | 'screen'
  | 'manage_segments'
  | 'import'
  | 'export';

export const ALL_STAKEHOLDER_PERMISSIONS: readonly StakeholderPermission[] = [
  'create',
  'edit',
  'engage',
  'manage_contacts',
  'screen',
  'manage_segments',
  'import',
  'export',
];

const grants: Record<string, readonly StakeholderPermission[]> = {
  'System Administrator': ALL_STAKEHOLDER_PERMISSIONS,
  'CRM Administrator': ALL_STAKEHOLDER_PERMISSIONS,
  'CCP Partnerships Manager': ALL_STAKEHOLDER_PERMISSIONS,
  'Partnerships Officer': [
    'create',
    'edit',
    'engage',
    'manage_contacts',
    'manage_segments',
    'import',
    'export',
  ],
  'IR Officer': ['engage'],
  'Executive Viewer': ['export'],
  Auditor: ['export'],
};

export function canManageStakeholders(
  role: string | undefined | null,
  permission: StakeholderPermission,
): boolean {
  return role ? (grants[role] ?? []).includes(permission) : false;
}

const hints: Record<StakeholderPermission, string> = {
  create: 'Your role cannot add stakeholders.',
  edit: 'Your role cannot edit stakeholder records.',
  engage: 'Your role cannot log engagements.',
  manage_contacts: 'Your role cannot change contacts or consent.',
  screen: 'Only CRM administrators and the CCP Partnerships Manager can record S203 decisions.',
  manage_segments: 'Your role cannot change audience segments.',
  import: 'Your role cannot import stakeholders.',
  export: 'Your role cannot export S081 data.',
};

/** Tooltip copy for a gated control; `undefined` when the role is allowed. */
export function permissionHint(
  role: string | undefined | null,
  permission: StakeholderPermission,
): string | undefined {
  return canManageStakeholders(role, permission) ? undefined : hints[permission];
}
