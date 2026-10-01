export type PartnershipPermission =
  | 'create'
  | 'edit'
  | 'manage_obligations'
  | 'manage_reviews'
  | 'manage_lifecycle'
  | 'import'
  | 'export';

const grants: Record<string, PartnershipPermission[]> = {
  'CRM Administrator': [
    'create',
    'edit',
    'manage_obligations',
    'manage_reviews',
    'manage_lifecycle',
    'import',
    'export',
  ],
  'CCP Partnerships Manager': [
    'create',
    'edit',
    'manage_obligations',
    'manage_reviews',
    'manage_lifecycle',
    'import',
    'export',
  ],
  Registrar: ['edit', 'manage_reviews', 'manage_lifecycle', 'export'],
  'Executive Viewer': ['export'],
  Auditor: ['export'],
};

export function canManagePartnership(role: string | undefined, permission: PartnershipPermission) {
  return role ? (grants[role] ?? []).includes(permission) : false;
}
