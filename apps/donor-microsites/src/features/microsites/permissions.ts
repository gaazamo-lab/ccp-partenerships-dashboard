/**
 * S091 role matrix. Read-only roles still see every screen; the buttons they
 * cannot use stay visible but disabled, with the reason beside them.
 */
export type MicrositePermission =
  | 'build'
  | 'submit'
  | 'review'
  | 'manage_access'
  | 'publish'
  | 'archive'
  | 'export';

const ALL: MicrositePermission[] = [
  'build',
  'submit',
  'review',
  'manage_access',
  'publish',
  'archive',
  'export',
];

const grants: Record<string, MicrositePermission[]> = {
  'System Administrator': ALL,
  'CRM Administrator': ALL,
  'CCP Partnerships Manager': ALL,
  'Content Manager': ['build', 'submit', 'export'],
  'RMF Reviewer': ['review', 'export'],
  'Executive Viewer': ['export'],
  Auditor: ['export'],
};

export function canMicrosite(role: string | undefined, permission: MicrositePermission): boolean {
  return role ? (grants[role] ?? []).includes(permission) : false;
}

export const PERMISSION_REASONS: Record<MicrositePermission, string> = {
  build: 'Your role cannot build or edit microsites.',
  submit: 'Your role cannot submit microsites for review.',
  review: 'Only RMF reviewers and CCP managers can record review decisions.',
  manage_access: 'Your role cannot change who can see a microsite.',
  publish: 'Only CCP Partnerships Managers and administrators can publish.',
  archive: 'Only CCP Partnerships Managers and administrators can archive.',
  export: 'Your role cannot export microsite data.',
};
