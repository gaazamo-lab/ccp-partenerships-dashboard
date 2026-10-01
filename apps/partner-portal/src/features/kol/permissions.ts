/**
 * S092 role matrix. `manage` covers creating and editing profiles, planning
 * engagements, moving content and logging mentions; `export` covers CSV
 * downloads. Everyone signed in to the portal can read the register.
 */
export type KolPermission = 'manage' | 'export';

const MANAGERS = [
  'System Administrator',
  'CRM Administrator',
  'CCP Partnerships Manager',
  'Partnerships Officer',
];

const READ_EXPORT = ['Executive Viewer', 'Auditor'];

const grants: Record<string, readonly KolPermission[]> = {
  ...Object.fromEntries(MANAGERS.map((role) => [role, ['manage', 'export'] as const])),
  ...Object.fromEntries(READ_EXPORT.map((role) => [role, ['export'] as const])),
};

export function canKol(role: string | undefined, permission: KolPermission): boolean {
  return role ? (grants[role] ?? []).includes(permission) : false;
}

export const MANAGE_DENIED_REASON = 'Your role can view KOL records but not change them.';
export const EXPORT_DENIED_REASON = 'Your role cannot export KOL data.';
