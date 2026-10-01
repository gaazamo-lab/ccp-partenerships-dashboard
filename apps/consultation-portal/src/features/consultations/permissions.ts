/**
 * S088 role matrix.
 *
 * - manage: Consultation Manager, CCP Partnerships Manager, CRM Administrator,
 *   System Administrator — build, publish, invite, code themes, publish outcomes.
 * - approve: AQAI/CDT reviewers (role `Registrar`) approve or return drafts. The
 *   two administrator roles hold it too so mock mode (signed in as CRM
 *   Administrator) can walk the whole lifecycle.
 * - view_identity: consented respondent details; managers only.
 * - Executive Viewer and Auditor read and export.
 */
export type ConsultationPermission = 'view' | 'manage' | 'approve' | 'export' | 'view_identity';

const MANAGE: ConsultationPermission[] = ['view', 'manage', 'export', 'view_identity'];

const grants: Record<string, ConsultationPermission[]> = {
  'System Administrator': [...MANAGE, 'approve'],
  'CRM Administrator': [...MANAGE, 'approve'],
  'Consultation Manager': MANAGE,
  'CCP Partnerships Manager': MANAGE,
  Registrar: ['view', 'approve', 'export'],
  'Executive Viewer': ['view', 'export'],
  Auditor: ['view', 'export'],
};

export function can(role: string | undefined, permission: ConsultationPermission): boolean {
  return role ? (grants[role] ?? []).includes(permission) : false;
}

const REASONS: Record<ConsultationPermission, string> = {
  view: 'Your role cannot view consultations.',
  manage: 'Only consultation managers and CRM administrators can do this.',
  approve: 'Only AQAI/CDT reviewers (Registrar) or administrators can approve or return consultations.',
  export: 'Your role cannot export consultation data.',
  view_identity: 'Only consultation managers can see consented respondent details.',
};

/** Why a gated control is disabled, or `undefined` when the role may use it. */
export function deniedReason(role: string | undefined, permission: ConsultationPermission): string | undefined {
  return can(role, permission) ? undefined : REASONS[permission];
}
